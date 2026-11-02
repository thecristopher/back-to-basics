-- Pure pieces of the React preview: where btb says it is serving.
local M = {}

---The address in one of btb preview's progress lines, nil when the line carries none.
---@param line string
---@return string|nil
function M.url_in(line)
  return line:match("(https?://[%w%.%-]+:%d+/?)")
end

return M
