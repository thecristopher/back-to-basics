-- Pure pieces of the active clock: how long the learner really worked on a solution, not how long it sat open.
local M = {}

---Gaps longer than this between two signs of life count as a pause, not as work.
M.IDLE_SECONDS = 90

---A clock with nothing counted yet.
---@return { pending: number, edits: integer, last: number|nil }
function M.new()
  return { pending = 0, edits = 0, last = nil }
end

---A sign of life in the solution buffer: the time since the last one counts unless it was a pause.
---@param clock { pending: number, edits: integer, last: number|nil } mutated in place
---@param now number seconds
---@param edited? boolean the text changed, not only the cursor
function M.touch(clock, now, edited)
  if clock.last and now - clock.last <= M.IDLE_SECONDS then
    clock.pending = clock.pending + (now - clock.last)
  end
  clock.last = now
  if edited then
    clock.edits = clock.edits + 1
  end
end

---The learner left the editor: the next sign of life starts counting again from there.
---@param clock { last: number|nil } mutated in place
function M.pause(clock)
  clock.last = nil
end

---Takes what the clock counted since it was last taken, so each run reports only its own share.
---@param clock { pending: number, edits: integer } mutated in place
---@return { seconds: integer, edits: integer }
function M.take(clock)
  local taken = { seconds = math.floor(clock.pending), edits = clock.edits }
  clock.pending = clock.pending - taken.seconds
  clock.edits = 0
  return taken
end

---The btb arguments plus the activity they carry, nothing added when there was none.
---@param args string[]
---@param taken { seconds: integer, edits: integer }
---@return string[]
function M.args(args, taken)
  if taken.seconds <= 0 and taken.edits <= 0 then
    return args
  end
  local out = vim.list_extend({}, args)
  vim.list_extend(out, { "--active=" .. taken.seconds, "--edits=" .. taken.edits })
  return out
end

return M
