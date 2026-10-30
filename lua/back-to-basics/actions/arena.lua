-- Pure pieces of the fight around a solution: failing tests on their lines, the onsite fight the
-- config can stage, the questions asked before a recap and Claude's review beside the reference.
local M = {}

local function first_line(text)
  for line in tostring(text or ""):gmatch("[^\n]+") do
    local trimmed = vim.trim(line)
    if trimmed ~= "" then
      return trimmed
    end
  end
  return nil
end

---The solution's line a stack trace or a traceback points at, the test file never counts.
---@param text string|nil
---@return integer|nil
function M.solution_line(text)
  text = tostring(text or "")
  local from = 1
  while true do
    local start, finish, line = text:find("solution%.%a+:(%d+)", from)
    if not start then
      return nil
    end
    local before = start > 1 and text:sub(start - 1, start - 1) or ""
    if not before:match("[%w_%.]") then
      return tonumber(line)
    end
    from = finish + 1
  end
end

local function clamp(line, line_count)
  return math.max(0, math.min((line or 1) - 1, math.max(0, line_count - 1)))
end

local function crash_diagnostics(data, line_count, messages)
  if data.timedOut then
    return { { lnum = 0, col = 0, message = messages.failure_timed_out } }
  end
  local message = first_line(data.stderr) or messages.failure_crashed
  return { { lnum = clamp(M.solution_line(data.stderr), line_count), col = 0, message = message } }
end

---Turns a failed test run into diagnostics on the solution: each failing test on the line it
---broke at, or on the first line when the failure never reached the solution.
---@param data table a btb test or submit --json answer
---@param line_count integer lines in the solution buffer
---@param messages table<string, string>
---@return { lnum: integer, col: integer, message: string }[]
function M.failure_diagnostics(data, line_count, messages)
  if not data or data.ok or data.error then
    return {}
  end
  if data.timedOut or data.crashed then
    return crash_diagnostics(data, line_count, messages)
  end
  local diagnostics = {}
  for _, failure in ipairs(data.failures or {}) do
    local why = first_line(failure.message)
    table.insert(diagnostics, {
      lnum = clamp(failure.line, line_count),
      col = 0,
      message = why and (failure.name .. ": " .. why) or failure.name,
    })
  end
  return diagnostics
end

---What the config needs to stage an onsite fight, nil when the run is not one.
---@param data table a btb test or submit --json answer
---@return { id: string, remaining: integer, total: integer, ok: boolean }|nil
function M.fight(data)
  if not data or not data.onsite or not data.id or not data.total or data.total == 0 then
    return nil
  end
  local passed = data.passed or 0
  return { id = data.id, remaining = data.total - passed, total = data.total, ok = data.ok == true }
end

---The reviews due today that left a question to think about, to ask before showing the recap.
---@param today table btb today --json
---@return { id: string, title: string, question: string }[]
function M.recall_questions(today)
  local questions = {}
  for _, item in ipairs((today and today.recap) or {}) do
    if item.question and vim.trim(item.question) ~= "" then
      table.insert(questions, { id = item.id, title = item.title, question = item.question })
    end
  end
  return questions
end

---What you answered from memory and what the coach said about it, written above the recap.
---@param answers { title: string, question: string, answer: string|nil, feedback: string|nil }[]
---@param messages table<string, string>
---@return string
function M.recall_text(answers, messages)
  local blocks = {}
  for _, entry in ipairs(answers) do
    local answer = entry.answer and vim.trim(entry.answer) ~= "" and entry.answer
      or messages.recall_blank
    local block = ("%s\n%s\n› %s"):format(entry.title, entry.question, answer)
    if entry.feedback and vim.trim(entry.feedback) ~= "" then
      block = block .. "\n\n" .. vim.trim(entry.feedback)
    end
    table.insert(blocks, block)
  end
  if #blocks == 0 then
    return ""
  end
  return messages.recall_header .. "\n\n" .. table.concat(blocks, "\n\n")
end

local LINE_MENTIONS =
  { "[Ll]ínea%s+(%d+)", "[Ll]ineas?%s+(%d+)", "[Ll]ines?%s+(%d+)", "%f[%w]L(%d+)" }

local function mentioned_line(text)
  for _, pattern in ipairs(LINE_MENTIONS) do
    local line = text:match(pattern)
    if line then
      return tonumber(line)
    end
  end
  return nil
end

---The review's remarks that name a line of the solution, ready to sit on that line.
---@param review string|nil Claude's review in markdown
---@return { line: integer, text: string }[]
function M.review_anchors(review)
  local anchors = {}
  for raw in tostring(review or ""):gmatch("[^\n]+") do
    local line = mentioned_line(raw)
    local text = vim.trim((raw:gsub("^%s*[-*]%s+", "")))
    if line and text ~= "" then
      table.insert(anchors, { line = line, text = text })
    end
  end
  return anchors
end

return M
