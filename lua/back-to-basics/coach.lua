-- The coach on screen: a toast in the corner for quick reactions, and the stage for the lesson.
local actions = require("back-to-basics.actions.coach")

local M = {}

local config = {
  enabled = true,
  speed = 12,
  toast_ms = 4500,
  portrait = nil,
  sound = nil,
  messages = {},
}

local toast = { win = nil, timer = nil }
local on_stage = false

---Takes the coach options and the plugin's strings.
---@param coach_opts table
---@param messages table<string, string>
---@param hooks { portrait?: fun(buf: integer, win: integer, persona: table), sound?: fun(event: string) }
function M.setup(coach_opts, messages, hooks)
  config = vim.tbl_extend("force", config, coach_opts or {})
  config.messages = messages
  config.portrait = hooks.portrait
  config.sound = hooks.sound
end

---Shows or hides the coach.
---@return boolean enabled
function M.toggle()
  config.enabled = not config.enabled
  return config.enabled
end

---@return boolean
function M.enabled()
  return config.enabled
end

---True while the stage is open, so a second lesson never stacks on top of it.
---@return boolean
function M.on_stage()
  return on_stage
end

local function play(event)
  if config.sound then
    pcall(config.sound, event)
  end
end

local function stop(timer)
  if timer and not timer:is_closing() then
    timer:stop()
    timer:close()
  end
end

local function close(win)
  if win and vim.api.nvim_win_is_valid(win) then
    pcall(vim.api.nvim_win_close, win, true)
  end
end

local function scratch(lines)
  local buf = vim.api.nvim_create_buf(false, true)
  vim.bo[buf].bufhidden = "wipe"
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  return buf
end

local function set_lines(buf, lines)
  if not vim.api.nvim_buf_is_valid(buf) then
    return
  end
  vim.bo[buf].modifiable = true
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  vim.bo[buf].modifiable = false
end

-- reveals the lines a few characters per tick, on_done runs once everything shows
local function typewrite(buf, lines, on_done)
  local shown = 0
  local timer = vim.uv.new_timer()
  timer:start(
    0,
    config.speed,
    vim.schedule_wrap(function()
      shown = shown + 2
      local visible, done = actions.reveal(lines, shown)
      set_lines(buf, visible)
      if done or not vim.api.nvim_buf_is_valid(buf) then
        stop(timer)
        if on_done then
          on_done()
        end
      end
    end)
  )
  return timer
end

local function close_toast()
  stop(toast.timer)
  stop(toast.typing)
  close(toast.win)
  toast = { win = nil, timer = nil }
end

---Has the coach say a line in the corner, it fades out on its own.
---@param persona { name: string, line: string, moment?: string }
function M.say(persona)
  if not config.enabled or not persona or not persona.line then
    return
  end
  close_toast()
  local layout = actions.toast_layout(vim.o.columns, 1)
  local lines = actions.wrap(persona.line, layout.width - 2)
  layout = actions.toast_layout(vim.o.columns, #lines)
  local buf = scratch({})
  vim.bo[buf].filetype = "btbcoach"
  -- no border here on purpose: Neovim falls back to 'winborder', so the toast follows the user's style
  toast.win = vim.api.nvim_open_win(buf, false, {
    relative = "editor",
    row = layout.row,
    col = layout.col,
    width = layout.width,
    height = layout.height,
    style = "minimal",
    focusable = false,
    zindex = 60,
    title = " " .. persona.name .. " ",
    title_pos = "left",
  })
  vim.wo[toast.win].wrap = true
  play(persona.moment or "coach_line")
  toast.typing = typewrite(buf, lines, function()
    toast.timer = vim.defer_fn(close_toast, config.toast_ms)
  end)
end

local function open_stage_windows(persona, layout)
  local text_buf = scratch({})
  vim.bo[text_buf].filetype = "markdown"
  local text_win = vim.api.nvim_open_win(text_buf, true, {
    relative = "editor",
    row = layout.row,
    col = layout.col + layout.portrait + (layout.portrait > 0 and 2 or 0),
    width = layout.text_width,
    height = layout.height,
    style = "minimal",
    zindex = 55,
    title = " " .. persona.name .. " ",
    title_pos = "center",
    footer = " " .. config.messages.stage_keys .. " ",
    footer_pos = "right",
  })
  vim.wo[text_win].wrap = true
  vim.wo[text_win].conceallevel = 2
  if layout.portrait == 0 then
    return text_buf, text_win, nil
  end
  local portrait_buf = scratch({})
  local portrait_win = vim.api.nvim_open_win(portrait_buf, false, {
    relative = "editor",
    row = layout.row,
    col = layout.col,
    width = layout.portrait,
    height = layout.height,
    style = "minimal",
    focusable = false,
    -- under the text, so a portrait hook can lay its own image float on top of this window
    zindex = 40,
  })
  local ok, err = pcall(config.portrait, portrait_buf, portrait_win, persona)
  if not ok then
    vim.notify("back-to-basics portrait: " .. tostring(err), vim.log.levels.WARN)
  end
  return text_buf, text_win, portrait_win
end

---Puts the coach center stage: the portrait on the left and the pages typed beside it.
---@param persona { id?: string, name: string, portrait?: string }
---@param pages string[][]
---@param on_done fun(confirmed: boolean) true when the learner went through every page
function M.stage(persona, pages, on_done)
  close_toast()
  local layout = actions.stage_layout(vim.o.columns, vim.o.lines, config.portrait ~= nil)
  local buf, win, portrait_win = open_stage_windows(persona, layout)
  local state = { page = 1, typing = nil, finished = false }
  on_stage = true
  play("coach_open")

  local function finish(confirmed)
    if state.finished then
      return
    end
    state.finished = true
    on_stage = false
    stop(state.typing)
    close(win)
    close(portrait_win)
    on_done(confirmed)
  end

  local function show(page)
    state.page = page
    stop(state.typing)
    state.typing = typewrite(buf, pages[page], function()
      state.typing = nil
    end)
  end

  local function forward()
    if state.typing then
      stop(state.typing)
      state.typing = nil
      return set_lines(buf, pages[state.page])
    end
    if state.page >= #pages then
      return finish(true)
    end
    show(state.page + 1)
  end

  local function back()
    if state.page > 1 then
      show(state.page - 1)
    end
  end

  local function map(keys, fn)
    for _, key in ipairs(keys) do
      vim.keymap.set("n", key, fn, { buffer = buf, nowait = true })
    end
  end
  map({ "<CR>", "<Space>", "l", "j" }, forward)
  map({ "h", "k", "<BS>" }, back)
  map({ "q", "<Esc>" }, function()
    finish(false)
  end)
  vim.api.nvim_create_autocmd("WinLeave", {
    buffer = buf,
    once = true,
    callback = function()
      vim.schedule(function()
        finish(false)
      end)
    end,
  })
  show(1)
end

---The stage pages for a text, sized to the stage the current editor would open.
---@param text string
---@return string[][]
function M.pages(text)
  local layout = actions.stage_layout(vim.o.columns, vim.o.lines, config.portrait ~= nil)
  return actions.pages(text, layout.text_width - 2, layout.height)
end

return M
