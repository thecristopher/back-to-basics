-- The React preview: `btb preview` runs in the background serving the exercise in the browser, one
-- at a time, and stops with Neovim.
local actions = require("back-to-basics.actions")
local preview_actions = require("back-to-basics.actions.preview")

local M = {}

local job = nil

---Stops the preview that is running, if any.
function M.stop()
  if job then
    job:kill("sigterm")
    job = nil
  end
end

---Serves an exercise in the browser, replacing the preview already running. btb opens the browser.
---@param opts { node: string, root: string, messages: table<string, string> }
---@param id string
---@param notify fun(msg: string, level?: integer)
function M.open(opts, id, notify)
  M.stop()
  local announced = false
  local function on_stderr(_, chunk)
    vim.schedule(function()
      for _, line in ipairs(actions.lines(chunk)) do
        local url = not announced and preview_actions.url_in(line)
        if url then
          announced = true
          notify(opts.messages.preview_at:format(url))
        end
      end
    end)
  end
  local this
  local ok, started = pcall(
    vim.system,
    actions.command(opts, { "preview", id }),
    { cwd = opts.root, text = true, stderr = on_stderr },
    function(result)
      vim.schedule(function()
        -- a stop on purpose is not an error, only a preview that ended by itself is
        if job ~= this then
          return
        end
        job = nil
        local data = actions.decode(result.stdout)
        if data and data.error then
          notify(data.error, vim.log.levels.ERROR)
        end
      end)
    end
  )
  if not ok then
    return notify(opts.messages.no_node:format(tostring(started)), vim.log.levels.ERROR)
  end
  this = started
  job = started
end

return M
