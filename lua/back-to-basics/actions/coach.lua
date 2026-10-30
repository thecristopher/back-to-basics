-- Pure pieces of the coach: which persona speaks, how the text wraps and pages, and where the panels sit.
local M = {}

---@alias BtbCoach { id: string, character?: string, franchise?: string }

---The coach to ask btb for, from a name, a character to summon, or what a function returns at the
---time of asking. A character comes as { id, character, franchise } so btb can summon them.
---@param persona string|BtbCoach|fun(): string|BtbCoach|nil|nil
---@return BtbCoach|nil
function M.persona_choice(persona)
  if type(persona) == "function" then
    local ok, picked = pcall(persona)
    persona = ok and picked or nil
  end
  if type(persona) == "string" and persona ~= "" then
    return { id = persona }
  end
  if type(persona) == "table" and type(persona.id) == "string" and persona.id ~= "" then
    return persona
  end
  return nil
end

---The name of the persona to ask btb for.
---@param persona string|BtbCoach|fun(): string|BtbCoach|nil|nil
---@return string|nil
function M.persona_name(persona)
  local choice = M.persona_choice(persona)
  return choice and choice.id or nil
end

---Adds the coach to btb's arguments: --persona, plus the character and franchise to summon them by.
---@param args string[]
---@param choice BtbCoach|string|nil
---@return string[]
function M.with_persona(args, choice)
  choice = M.persona_choice(choice)
  if not choice then
    return args
  end
  local copy = vim.list_extend({}, args)
  table.insert(copy, "--persona=" .. choice.id)
  if choice.character and choice.franchise then
    table.insert(copy, "--character=" .. choice.character)
    table.insert(copy, "--franchise=" .. choice.franchise)
  end
  return copy
end

---Wraps a paragraph to a width on spaces, keeping words whole.
---@param text string
---@param width integer
---@return string[]
function M.wrap(text, width)
  local lines, line = {}, ""
  for word in text:gmatch("%S+") do
    local candidate = line == "" and word or (line .. " " .. word)
    if line ~= "" and vim.fn.strdisplaywidth(candidate) > width then
      table.insert(lines, line)
      candidate = word
    end
    line = candidate
  end
  if line ~= "" then
    table.insert(lines, line)
  end
  return lines
end

local function is_code_fence(line)
  return line:match("^%s*```") ~= nil
end

-- code blocks keep their lines as they are, prose gets wrapped
local function wrap_markdown(text, width)
  local lines, in_code = {}, false
  for _, raw in ipairs(vim.split(text, "\n", { plain = true })) do
    if is_code_fence(raw) then
      in_code = not in_code
      table.insert(lines, raw)
    elseif in_code or raw:match("^%s*$") then
      table.insert(lines, raw)
    else
      vim.list_extend(lines, M.wrap(raw, width))
    end
  end
  return lines
end

local function flush(pages, page)
  while #page > 0 and page[#page] == "" do
    table.remove(page)
  end
  if #page > 0 then
    table.insert(pages, page)
  end
end

---Splits markdown into pages that fit the panel, breaking only on blank lines when it can.
---@param text string
---@param width integer
---@param height integer lines per page
---@return string[][]
function M.pages(text, width, height)
  local pages, page = {}, {}
  for _, line in ipairs(wrap_markdown(text, width)) do
    local paragraph_ends = line == "" and #page >= math.floor(height * 0.6)
    if #page >= height or paragraph_ends then
      flush(pages, page)
      page = {}
    end
    if not (line == "" and #page == 0) then
      table.insert(page, line)
    end
  end
  flush(pages, page)
  return pages
end

---The lines with only their first characters showing, for the typewriter.
---@param lines string[]
---@param shown integer characters revealed so far, across lines
---@return string[] visible
---@return boolean done every character is showing
function M.reveal(lines, shown)
  local visible, left = {}, shown
  for _, line in ipairs(lines) do
    local length = vim.fn.strchars(line)
    if left <= 0 then
      table.insert(visible, "")
    else
      table.insert(visible, vim.fn.strcharpart(line, 0, left))
    end
    left = left - length
  end
  return visible, left >= 0
end

-- a portrait is about 5:6 and a cell twice as tall as it is wide, so it wants 1.64 columns per row
M.PORTRAIT_COLUMNS_PER_ROW = 1.64
local MIN_TEXT = 36
local MIN_PORTRAIT = 12

-- as wide as the stage height asks for, never more than 40% of the stage, none when the text would starve
local function portrait_width(width, height)
  local wanted = math.floor(height * M.PORTRAIT_COLUMNS_PER_ROW + 0.5)
  local portrait = math.min(wanted, math.floor(width * 0.4))
  if portrait < MIN_PORTRAIT or width - portrait - 2 < MIN_TEXT then
    return 0
  end
  return portrait
end

---Where the stage sits: centered, with room on the left for the portrait when there is one.
---@param columns integer
---@param rows integer
---@param with_portrait boolean
---@return { row: integer, col: integer, width: integer, height: integer, portrait: integer, text_width: integer }
function M.stage_layout(columns, rows, with_portrait)
  local width = math.max(40, math.min(100, columns - 8))
  local height = math.max(8, math.min(20, rows - 8))
  local portrait = with_portrait and portrait_width(width, height) or 0
  return {
    row = math.floor((rows - height) / 2),
    col = math.floor((columns - width) / 2),
    width = width,
    height = height,
    portrait = portrait,
    text_width = width - portrait - (portrait > 0 and 2 or 0),
  }
end

---Where the toast sits: the top right corner, as tall as its lines.
---@param columns integer
---@param line_count integer
---@return { row: integer, col: integer, width: integer, height: integer }
function M.toast_layout(columns, line_count)
  local width = math.max(24, math.min(52, columns - 4))
  return { row = 1, col = columns - width - 2, width = width, height = math.max(1, line_count) }
end

return M
