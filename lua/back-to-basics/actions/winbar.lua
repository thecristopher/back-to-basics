-- Pure pieces of the exercise winbar: what the fight looks like at a glance while you write.
local M = {}

local function escape(text)
  return (tostring(text):gsub("%%", "%%%%"))
end

---Time spent on the exercise, in minutes until it passes an hour.
---@param ms integer
---@return string
function M.elapsed(ms)
  local minutes = math.floor(math.max(0, ms) / 60000)
  if minutes < 60 then
    return minutes .. " min"
  end
  return ("%d h %02d"):format(math.floor(minutes / 60), minutes % 60)
end

local function tests_chunk(tests)
  local group = tests.ok and "DiagnosticOk" or "DiagnosticError"
  local mark = tests.ok and "✓" or "✗"
  return ("%%#%s#%s %d/%d%%*"):format(group, mark, tests.passed, tests.total)
end

---The winbar of a solution: title, level, clock, hints left, the last test run and the keys.
---@param info { id: string, title?: string, level?: integer, startedAt?: integer, hintsLeft?: integer, tests?: { passed: integer, total: integer, ok: boolean } }
---@param now_ms integer
---@param messages table<string, string>
---@param keys string|false the keymap prefix, false when there are no keymaps
---@return string statusline formatted
function M.text(info, now_ms, messages, keys)
  local parts = { "%#Title# " .. escape(info.title or info.id) .. "%*" }
  if info.level then
    table.insert(parts, messages.winbar_level:format(info.level))
  end
  if info.startedAt then
    table.insert(parts, "󱎫 " .. M.elapsed(now_ms - info.startedAt))
  end
  if info.hintsLeft then
    table.insert(parts, messages.winbar_hints:format(info.hintsLeft))
  end
  if info.tests then
    table.insert(parts, tests_chunk(info.tests))
  end
  local text = table.concat(parts, "  ")
  if not keys then
    return text
  end
  local prefix = keys:gsub("<leader>", "␣")
  return text .. "%=%#Comment#" .. escape(prefix .. "  " .. messages.winbar_keys) .. " %*"
end

---What a btb answer changes in the winbar: the opened exercise, a test run or a hint.
---@param data table a btb --json answer
---@return table|nil fields to merge, nil when it changes nothing
function M.fields(data)
  if not data or data.error or not data.id then
    return nil
  end
  local fields = {}
  if data.path then
    fields.title, fields.level, fields.startedAt = data.title, data.level, data.startedAt
  end
  if data.total and data.passed then
    fields.tests = { passed = data.passed, total = data.total, ok = data.ok == true }
  end
  if data.hintsLeft then
    fields.hintsLeft = data.hintsLeft
  elseif data.hints and data.total then
    fields.hintsLeft = math.max(0, data.total - #data.hints)
  end
  return fields
end

---What save does: the practice run by default. The old submit_on_save still works.
---@param user_opts table|nil
---@return "test"|"submit"|false
function M.save_mode(user_opts)
  user_opts = user_opts or {}
  if user_opts.on_save ~= nil then
    return user_opts.on_save
  end
  if user_opts.submit_on_save ~= nil then
    return user_opts.submit_on_save and "submit" or false
  end
  return "test"
end

return M
