-- The plugin's windows: report floats, and the exercise beside its statement.
local actions = require("back-to-basics.actions")

local M = {}

---Shows lines in a scratch float that q or <Esc> closes.
---@param lines string[]
---@param opts? { title?: string, filetype?: string }
---@return integer buf
---@return integer win
function M.float(lines, opts)
  opts = opts or {}
  local buf = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, lines)
  vim.bo[buf].modifiable = false
  vim.bo[buf].bufhidden = "wipe"
  vim.bo[buf].filetype = opts.filetype or "btb"
  local width, height = actions.float_size(lines, vim.o.columns, vim.o.lines)
  -- no border here on purpose: Neovim falls back to 'winborder', so the float follows the user's style
  local win = vim.api.nvim_open_win(buf, true, {
    relative = "editor",
    width = width,
    height = height,
    row = math.floor((vim.o.lines - height) / 2),
    col = math.floor((vim.o.columns - width) / 2),
    style = "minimal",
    title = opts.title and (" " .. opts.title .. " ") or nil,
    title_pos = opts.title and "center" or nil,
  })
  vim.wo[win].wrap = true
  for _, key in ipairs({ "q", "<Esc>" }) do
    vim.keymap.set("n", key, function()
      pcall(vim.api.nvim_win_close, win, true)
    end, { buffer = buf, nowait = true })
  end
  return buf, win
end

---Asks a question in a float with the answer typed in a float right below it. <CR> sends the
---answer, <Esc> or q back out with nil.
---@param question string[]
---@param opts { title: string, prompt: string }
---@param on_answer fun(answer: string|nil)
function M.ask(question, opts, on_answer)
  local width = actions.float_size(question, vim.o.columns, vim.o.lines)
  local height = math.max(1, math.min(#question, vim.o.lines - 12))
  local answer_height = 3
  -- the borders take a row above and below each float
  local row = math.floor((vim.o.lines - height - answer_height - 4) / 2)
  local col = math.floor((vim.o.columns - width) / 2)

  local question_buf = vim.api.nvim_create_buf(false, true)
  vim.api.nvim_buf_set_lines(question_buf, 0, -1, false, question)
  vim.bo[question_buf].modifiable = false
  vim.bo[question_buf].bufhidden = "wipe"
  local question_win = vim.api.nvim_open_win(question_buf, false, {
    relative = "editor",
    width = width,
    height = height,
    row = row,
    col = col,
    style = "minimal",
    focusable = false,
    title = " " .. opts.title .. " ",
    title_pos = "center",
  })

  local answer_buf = vim.api.nvim_create_buf(false, true)
  vim.bo[answer_buf].bufhidden = "wipe"
  local answer_win = vim.api.nvim_open_win(answer_buf, true, {
    relative = "editor",
    width = width,
    height = answer_height,
    row = row + height + 2,
    col = col,
    style = "minimal",
    title = " " .. opts.prompt .. " ",
    title_pos = "left",
  })
  vim.wo[answer_win].wrap = true

  local finished = false
  local function finish(answer)
    if finished then
      return
    end
    finished = true
    vim.cmd.stopinsert()
    pcall(vim.api.nvim_win_close, answer_win, true)
    pcall(vim.api.nvim_win_close, question_win, true)
    vim.schedule(function()
      on_answer(answer)
    end)
  end

  vim.keymap.set({ "i", "n" }, "<CR>", function()
    finish(vim.trim(table.concat(vim.api.nvim_buf_get_lines(answer_buf, 0, -1, false), " ")))
  end, { buffer = answer_buf, nowait = true })
  for _, key in ipairs({ "q", "<Esc>" }) do
    vim.keymap.set("n", key, function()
      finish(nil)
    end, { buffer = answer_buf, nowait = true })
  end
  vim.api.nvim_create_autocmd("WinLeave", {
    buffer = answer_buf,
    once = true,
    callback = function()
      finish(nil)
    end,
  })
  vim.cmd.startinsert()
end

local function statement_window()
  for _, win in ipairs(vim.api.nvim_tabpage_list_wins(0)) do
    if vim.w[win].btb_statement then
      return win
    end
  end
  return nil
end

local function protect_statement()
  vim.bo.readonly = true
  vim.bo.modifiable = false
  vim.wo.wrap = true
  vim.wo.linebreak = true
end

---Shows the statement in a window on the right, reusing the one already open.
---@param readme string
function M.show_statement(readme)
  local win = statement_window()
  if win then
    vim.api.nvim_win_call(win, function()
      -- the statement buffer is locked, unlock it so the new one can load in its place
      vim.bo.modifiable = true
      vim.cmd.edit({ args = { readme }, bang = true })
      protect_statement()
    end)
    return
  end
  vim.cmd("botright vsplit " .. vim.fn.fnameescape(readme))
  vim.w.btb_statement = true
  vim.cmd("vertical resize " .. math.floor(vim.o.columns * 0.4))
  protect_statement()
end

---Opens the solution in the current window and its statement beside it.
---@param data { id: string, path: string, readme: string, redo?: boolean }
---@return integer buf the solution buffer
function M.open_exercise(data)
  local editor = vim.api.nvim_get_current_win()
  if vim.w[editor].btb_statement then
    vim.cmd("wincmd p")
    editor = vim.api.nvim_get_current_win()
  end
  vim.cmd.edit({ args = { data.path } })
  local buf = vim.api.nvim_get_current_buf()
  vim.b[buf].btb_exercise = data.id
  vim.b[buf].btb_redo = data.redo == true
  M.show_statement(data.readme)
  vim.api.nvim_set_current_win(editor)
  return buf
end

return M
