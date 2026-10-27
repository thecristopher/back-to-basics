-- Runs the btb CLI without blocking the editor and hands back its JSON report.
local actions = require("back-to-basics.actions")

local M = {}

local function stream(on_progress)
  if not on_progress then
    return nil
  end
  return function(_, chunk)
    if not chunk then
      return
    end
    vim.schedule(function()
      for _, line in ipairs(actions.lines(chunk)) do
        on_progress(line)
      end
    end)
  end
end

---Runs `btb <args> --json` in the back-to-basics folder.
---@param opts { node: string, root: string, messages: table<string, string> }
---@param args string[]
---@param on_done fun(data: table) on the main loop, with `error` set when btb could not answer
---@param on_progress? fun(line: string) each line btb reports while it works, like Claude forging
function M.run(opts, args, on_done, on_progress)
  local command = actions.command(opts, args)
  local ok, err = pcall(vim.system, command, {
    cwd = opts.root,
    text = true,
    stderr = stream(on_progress),
  }, function(result)
    vim.schedule(function()
      local data, raw = actions.decode(result.stdout)
      on_done(data or { error = opts.messages.no_json:format(raw) })
    end)
  end)
  if not ok then
    on_done({ error = opts.messages.no_node:format(tostring(err)) })
  end
end

return M
