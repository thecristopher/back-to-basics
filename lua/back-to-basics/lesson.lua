-- The lesson with the coach: the greeting, the briefing of the next exercise, then the fight.
local actions = require("back-to-basics.actions")
local coach = require("back-to-basics.coach")

local M = {}

---@class BtbHost
---@field run fun(args: string[], on_done: fun(data: table), on_progress?: fun(line: string))
---@field notify fun(msg: string, level?: integer)
---@field progress fun(line: string)
---@field open fun(data: table) opens an exercise the way btb next does
---@field messages table<string, string>

local function speaker(host, data)
  return data.persona or { name = host.messages.coach }
end

local function joined(...)
  local parts = vim.tbl_filter(function(part)
    return part and vim.trim(part) ~= ""
  end, { ... })
  return table.concat(parts, "\n\n")
end

local function report_text(data)
  return table.concat(actions.text_lines(data), "\n")
end

local function debrief(host, data)
  local line = data.persona and data.persona.line
  coach.stage(speaker(host, data), coach.pages(joined(line, report_text(data))), function() end)
end

-- the exercise opens either way: btb already started its clock when it handed it over
local function brief_then_open(host, opened)
  host.run({ "brief", opened.id }, function(brief)
    if brief.error then
      host.notify(brief.error, vim.log.levels.WARN)
      return host.open(opened)
    end
    local ready = opened.persona and opened.persona.line
    local text = joined(brief.brief, ready, host.messages.stage_start)
    coach.stage(speaker(host, opened), coach.pages(text), function()
      host.open(opened)
    end)
  end, host.progress)
end

local function open_next(host)
  host.run({ "next" }, function(data)
    if data.error then
      return host.notify(data.error, vim.log.levels.ERROR)
    end
    if data.done then
      return debrief(host, data)
    end
    brief_then_open(host, data)
  end, host.progress)
end

---Starts the lesson: the coach greets with today's plan, briefs the next exercise and opens it.
---@param host BtbHost
function M.start(host)
  if coach.on_stage() then
    return
  end
  host.run({ "today" }, function(today)
    if today.error then
      return host.notify(today.error, vim.log.levels.ERROR)
    end
    local greeting = today.persona and today.persona.line
    coach.stage(
      speaker(host, today),
      coach.pages(joined(greeting, report_text(today))),
      function(confirmed)
        if confirmed then
          open_next(host)
        end
      end
    )
  end, host.progress)
end

---Brings the coach back with the briefing of an exercise.
---@param host BtbHost
---@param id string
function M.reopen(host, id)
  host.run({ "brief", id }, function(brief)
    if brief.error then
      return host.notify(brief.error, vim.log.levels.WARN)
    end
    coach.stage(speaker(host, brief), coach.pages(brief.brief), function() end)
  end, host.progress)
end

return M
