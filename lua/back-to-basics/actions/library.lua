-- Pure pieces of the lesson library: how an entry reads in the picker and what can be done with it.
local M = {}

local GLYPHS = { mastered = "★", due = "↻", solved = "✓", started = "~", new = "·" }

---How a lesson reads in the picker: its state, track and level, title and concepts.
---@param entry table one of btb lessons --json
---@return string
function M.format(entry)
  local glyph = GLYPHS[entry.state] or "·"
  local where = entry.placement and entry.track or (entry.track .. " " .. entry.level)
  local concepts = table.concat(entry.concepts or {}, ", ")
  return string.format("%s [%s] %s  (%s)", glyph, where, entry.title, concepts)
end

---What can be done with a lesson, only the choices that make sense for where it stands.
---@param entry table one of btb lessons --json
---@param messages table<string, string>
---@return { key: string, label: string }[]
function M.choices(entry, messages)
  local choices = {}
  local function add(key, when)
    if when then
      table.insert(choices, { key = key, label = messages["library_" .. key] })
    end
  end
  add("lesson", entry.lesson ~= nil)
  add("brief", entry.lesson ~= nil)
  add("start", not entry.unlocked)
  add("solution", entry.solution ~= nil)
  add("review", entry.solvedAt ~= nil)
  add("reveal", entry.unlocked)
  add("redo", entry.unlocked)
  return choices
end

return M
