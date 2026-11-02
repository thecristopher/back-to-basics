-- The JSON contracts btb keeps with the editors, read from contracts/ in the btb clone. The same small part
-- of JSON Schema as src/actions/contract.js: type, const, enum, required, properties and items.
local M = {}

local function type_of(value)
  if value == nil or value == vim.NIL then
    return "null"
  end
  local kind = type(value)
  if kind == "table" then
    if next(value) == nil then
      return "empty"
    end
    return vim.islist(value) and "array" or "object"
  end
  if kind == "number" then
    return value == math.floor(value) and "integer" or "number"
  end
  return kind
end

local function fits(actual, expected)
  if actual == "empty" then
    return expected == "array" or expected == "object"
  end
  return expected == actual or (expected == "number" and actual == "integer")
end

local function fits_type(value, wanted)
  local actual = type_of(value)
  for _, expected in ipairs(type(wanted) == "table" and wanted or { wanted }) do
    if fits(actual, expected) then
      return true
    end
  end
  return false
end

local function value_problems(schema, value, at)
  if schema.const ~= nil and value ~= schema.const then
    return { at .. " must be " .. vim.inspect(schema.const) }
  end
  if schema.enum and not vim.tbl_contains(schema.enum, value) then
    return { at .. " must be one of " .. table.concat(schema.enum, ", ") }
  end
  if schema.type and not fits_type(value, schema.type) then
    return { ("%s must be %s, got %s"):format(at, vim.inspect(schema.type), type_of(value)) }
  end
  return {}
end

---True when a contract lets the value be null.
---@param schema table|nil
---@return boolean
function M.nullable(schema)
  local wanted = schema and schema.type
  return wanted == "null" or (type(wanted) == "table" and vim.tbl_contains(wanted, "null"))
end

---Where a value breaks a contract, empty when it keeps it. Keys the contract does not name are allowed.
---@param schema table a contract from contracts/
---@param value any decoded with vim.json.decode
---@param at? string where the value sits, for the messages
---@return string[]
function M.problems(schema, value, at)
  at = at or "$"
  local own = value_problems(schema, value, at)
  if #own > 0 then
    return own
  end
  local kind = type_of(value)
  local found = {}
  if kind == "object" then
    for _, key in ipairs(schema.required or {}) do
      -- editors decode JSON null as nil, so a required key that may be null can be absent
      if value[key] == nil and not M.nullable((schema.properties or {})[key]) then
        table.insert(found, at .. "." .. key .. " is missing")
      end
    end
    for key, child in pairs(schema.properties or {}) do
      if value[key] ~= nil then
        vim.list_extend(found, M.problems(child, value[key], at .. "." .. key))
      end
    end
  elseif kind == "array" and schema.items then
    for index, item in ipairs(value) do
      vim.list_extend(found, M.problems(schema.items, item, ("%s[%d]"):format(at, index - 1)))
    end
  end
  return found
end

local function read_json(file)
  local ok, lines = pcall(vim.fn.readfile, file)
  if not ok then
    return nil
  end
  -- decoded the way the plugin decodes btb's answers, null as nil
  return vim.json.decode(table.concat(lines, "\n"), { luanil = { object = true, array = true } })
end

---A contract and its committed sample, the sample decoded as the plugin decodes btb's answers.
---Both nil when the clone has no contracts.
---@param root string the btb clone
---@param name string e.g. "today"
---@return table|nil schema
---@return table|nil sample
function M.load(root, name)
  return read_json(root .. "/contracts/" .. name .. ".schema.json"),
    read_json(root .. "/contracts/samples/" .. name .. ".json")
end

---The contracts btb keeps with the editors.
M.NAMES = { "open", "submit-failed", "hint", "submit-passed", "today", "status" }

return M
