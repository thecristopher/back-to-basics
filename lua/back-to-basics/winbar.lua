-- The exercise winbar: title, level, clock, hints left, the last test run and the keys, always in sight.
local actions = require("back-to-basics.actions.winbar")

local M = {}

local infos = {}
local settings = { messages = {}, keys = false }
local clock = nil

local EXPRESSION = "%{%v:lua.require'back-to-basics.winbar'.render()%}"

-- a redo keeps its own clock and its ghost, apart from the first solution of the same exercise
local function key_of(id, redo)
  return redo and (id .. "#redo") or id
end

---Renders the winbar of the window being drawn.
---@return string
function M.render()
  local win = vim.g.statusline_winid or vim.api.nvim_get_current_win()
  local buf = vim.api.nvim_win_get_buf(win)
  local id = vim.b[buf].btb_exercise
  local info = id and infos[key_of(id, vim.b[buf].btb_redo == true)]
  if not info then
    return ""
  end
  return actions.text(info, os.time() * 1000, settings.messages, settings.keys)
end

-- the clock moves by the minute, a redraw every 20 seconds keeps it honest without busy work
local function start_clock()
  if clock then
    return
  end
  clock = vim.uv.new_timer()
  clock:start(
    20000,
    20000,
    vim.schedule_wrap(function()
      vim.cmd("redrawstatus!")
    end)
  )
end

local function show(win)
  vim.wo[win].winbar = EXPRESSION
end

---Gives the windows showing a solution buffer the winbar, now and every time it comes back.
---@param buf integer
---@param id string
function M.attach(buf, id)
  local key = key_of(id, vim.b[buf].btb_redo == true)
  infos[key] = infos[key] or { id = id }
  if vim.b[buf].btb_winbar then
    return
  end
  vim.b[buf].btb_winbar = true
  for _, win in ipairs(vim.fn.win_findbuf(buf)) do
    show(win)
  end
  vim.api.nvim_create_autocmd("BufWinEnter", {
    buffer = buf,
    callback = function()
      show(vim.api.nvim_get_current_win())
    end,
  })
  vim.api.nvim_create_autocmd("BufWinLeave", {
    buffer = buf,
    callback = function()
      vim.wo.winbar = ""
    end,
  })
  start_clock()
end

---What the winbar knows about an exercise, nil before btb said anything about it.
---@param id string
---@param redo? boolean the redo's winbar instead of the solution's
---@return table|nil
function M.info(id, redo)
  return infos[key_of(id, redo)]
end

---Folds a btb answer into the exercise's winbar.
---@param data table a btb --json answer
function M.update(data)
  local fields = actions.fields(data)
  if not fields then
    return
  end
  local key = key_of(data.id, data.redo == true)
  infos[key] = vim.tbl_extend("force", infos[key] or { id = data.id }, fields)
  vim.cmd("redrawstatus!")
end

---@param messages table<string, string>
---@param keys string|false
function M.setup(messages, keys)
  settings = { messages = messages, keys = keys }
end

return M
