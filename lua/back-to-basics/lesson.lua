-- The lesson with the coach: the greeting, the briefing of the next exercise, then the fight.
local actions = require("back-to-basics.actions")
local arena = require("back-to-basics.actions.arena")
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

-- runs fn once the moment comes, never earlier than ms after the gate was made
local function gate(ms)
  local opens_at = vim.uv.now() + (ms or 0)
  return function(fn)
    vim.defer_fn(fn, math.max(0, opens_at - vim.uv.now()))
  end
end

local function now(fn)
  fn()
end

-- the exercise opens either way: btb already started its clock when it handed it over
local function brief_then_open(host, opened, wait)
  host.run({ "brief", opened.id }, function(brief)
    if brief.error then
      host.notify(brief.error, vim.log.levels.WARN)
      return host.open(opened)
    end
    local ready = opened.persona and opened.persona.line
    local text = joined(ready, brief.brief, host.messages.stage_start)
    wait(function()
      coach.stage(speaker(host, opened), coach.pages(text), function()
        host.open(opened)
      end)
    end)
  end, host.progress)
end

local function open_next(host, wait)
  wait = wait or now
  host.run({ "next" }, function(data)
    if data.error then
      return host.notify(data.error, vim.log.levels.ERROR)
    end
    if data.done then
      return wait(function()
        debrief(host, data)
      end)
    end
    brief_then_open(host, data, wait)
  end, host.progress)
end

---Takes the learner from a pass to what comes next: the next exercise briefed by the coach, or the
---day's summary when it was the last one. The pass gets ms on screen before the stage opens, its
---notice already carried the coach's comment, so the stage starts on what comes next.
---@param host BtbHost
---@param passed table btb submit --json of a pass
---@param ms? integer
function M.advance(host, passed, ms)
  if coach.on_stage() then
    return
  end
  local wait = gate(ms)
  if passed.day then
    return wait(function()
      debrief(host, passed)
    end)
  end
  open_next(host, wait)
end

-- each review that left a question is asked from memory first, the recap only comes after
local function recall(host, questions, on_done)
  local answers = {}
  local function ask(index)
    local entry = questions[index]
    if not entry then
      return on_done(arena.recall_text(answers, host.messages))
    end
    local prompt = host.messages.recall_prompt:format(entry.title, entry.question)
    vim.ui.input({ prompt = prompt }, function(answer)
      table.insert(answers, { title = entry.title, question = entry.question, answer = answer })
      ask(index + 1)
    end)
  end
  ask(1)
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
    recall(host, arena.recall_questions(today), function(remembered)
      local greeting = today.persona and today.persona.line
      coach.stage(
        speaker(host, today),
        coach.pages(joined(greeting, remembered, report_text(today))),
        function(confirmed)
          if confirmed then
            open_next(host)
          end
        end
      )
    end)
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
