-- Pure pieces of the hint float: the hint just bought on top, the earlier ones below, as markdown.
local M = {}

local function numbered(hints, first, last)
  local lines = {}
  for index = first, last do
    table.insert(lines, string.format("%d. %s", index, hints[index]))
  end
  return lines
end

-- the nudge at the mistake the last run looks like reads first, the general hints seen so far below
local function nudge_lines(data, messages)
  local hints = data.hints or {}
  local lines = { "# " .. messages.nudge_title:format(data.cost or 0), "", data.nudge }
  if #hints == 0 then
    return lines
  end
  vim.list_extend(lines, { "", "---", "", "**" .. messages.hints_earlier .. "**", "" })
  return vim.list_extend(lines, numbered(hints, 1, #hints))
end

---The hints of a round as markdown: the new one first and alone, the ones already seen under it.
---When every hint was already bought (cost 0) they all read the same, in order. A nudge at the
---known mistake the last run looks like takes the top instead.
---@param data { hints: string[], total: integer, cost: integer, nudge?: string } btb hint --json
---@param messages table<string, string>
---@return string[]
function M.lines(data, messages)
  if data.nudge then
    return nudge_lines(data, messages)
  end
  local hints = data.hints or {}
  local latest = #hints
  if latest == 0 then
    return {}
  end
  if (data.cost or 0) == 0 then
    local lines = { "# " .. messages.hints_all, "" }
    for index, hint in ipairs(hints) do
      vim.list_extend(lines, { string.format("%d. %s", index, hint), "" })
    end
    table.remove(lines)
    return lines
  end
  local title = messages.hint_title:format(latest, data.total or latest, data.cost)
  local lines = { "# " .. title, "", hints[latest] }
  if latest == 1 then
    return lines
  end
  vim.list_extend(lines, { "", "---", "", "**" .. messages.hints_earlier .. "**", "" })
  return vim.list_extend(lines, numbered(hints, 1, latest - 1))
end

return M
