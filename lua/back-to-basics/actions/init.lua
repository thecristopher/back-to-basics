-- Pure pieces of the Neovim plugin: the btb command line, its JSON answers and the workspace paths.
local M = {}

M.MESSAGES = {
  es = {
    not_exercise = "Este buffer no es un ejercicio de back-to-basics.",
    running_tests = "Corriendo los tests...",
    no_node = "No pude correr btb: %s",
    no_json = "btb no respondió con JSON: %s",
  },
  en = {
    not_exercise = "This buffer is not a back-to-basics exercise.",
    running_tests = "Running the tests...",
    no_node = "Could not run btb: %s",
    no_json = "btb did not answer with JSON: %s",
  },
}

---The plugin's own strings in the language btb is set to, English when it is not translated.
---@param language string|nil
---@return table<string, string>
function M.messages(language)
  return M.MESSAGES[language] or M.MESSAGES.en
end

---What the plugin needs from btb.config.json: the language and where solutions live.
---@param config table|nil the decoded btb.config.json, nil when there is none
---@param root string the back-to-basics folder
---@return { language: string, workspace: string }
function M.settings(config, root)
  config = config or {}
  local workspace = config.workspace or "workspace"
  if workspace:sub(1, 1) ~= "/" then
    workspace = root .. "/" .. workspace
  end
  return { language = config.language or "es", workspace = workspace }
end

---The btb command line for some arguments, always asking for JSON.
---@param opts { node: string, root: string }
---@param args string[]
---@return string[]
function M.command(opts, args)
  local command = { opts.node, opts.root .. "/bin/btb.js" }
  vim.list_extend(command, args)
  table.insert(command, "--json")
  return command
end

---Reads btb's JSON answer. JSON null becomes nil.
---@param stdout string|nil
---@return table|nil data
---@return string|nil err the start of the output when it was not JSON
function M.decode(stdout)
  local nulls = { luanil = { object = true, array = true } }
  local ok, data = pcall(vim.json.decode, stdout or "", nulls)
  if not ok or type(data) ~= "table" then
    return nil, vim.trim(stdout or ""):sub(1, 200)
  end
  return data, nil
end

---Splits a chunk of output into its non empty lines.
---@param chunk string|nil
---@return string[]
function M.lines(chunk)
  return vim.tbl_filter(function(line)
    return vim.trim(line) ~= ""
  end, vim.split(chunk or "", "\n", { plain = true }))
end

---The text btb printed for a report, as buffer lines.
---@param data table a btb --json answer
---@return string[]
function M.text_lines(data)
  local lines = {}
  for _, chunk in ipairs(data.text or {}) do
    vim.list_extend(lines, vim.split(chunk, "\n", { plain = true }))
  end
  return lines
end

---The exercise id of a solution file under the workspace, nil for any other file.
---@param path string absolute
---@param workspace string absolute
---@return string|nil
function M.exercise_of(path, workspace)
  local prefix = workspace:gsub("/+$", "") .. "/"
  if path:sub(1, #prefix) ~= prefix then
    return nil
  end
  local track, slug, file = path:sub(#prefix + 1):match("^([^/]+)/([^/]+)/([^/]+)$")
  if not track or not file:match("^solution%.") then
    return nil
  end
  return track .. "/" .. slug
end

---How a submit went.
---@param data table btb submit --json
---@return "passed"|"failed"|"repeat"|"error"
function M.verdict(data)
  if data.error then
    return "error"
  end
  if data["repeat"] then
    return "repeat"
  end
  return data.ok and "passed" or "failed"
end

---Payload of the User BtbResult event, so the rest of the config can react to a submit.
---@param data table btb submit --json
---@return { id: string, ok: boolean, outcome: string|nil, xp: number, level_up: number|nil, mastered: boolean, placement_finished: boolean }
function M.event_data(data)
  local placement = type(data.placement) == "table" and data.placement or {}
  return {
    id = data.id,
    ok = data.ok == true,
    outcome = data.outcome,
    xp = data.xp or 0,
    level_up = data.levelUp,
    mastered = data.mastered == true,
    placement_finished = placement.finished == true,
  }
end

---The track to forge for ahead of time: the first slot of the day with nothing forged yet.
---@param today table btb today --json
---@return string|nil
function M.forge_target(today)
  if today.error or today.placement == "running" then
    return nil
  end
  for _, item in ipairs(today.queue or {}) do
    if item.slot and not item.ready then
      return item.track
    end
  end
  return nil
end

---Size of a float that fits the lines, kept inside the editor.
---@param lines string[]
---@param columns number
---@param rows number
---@return number width
---@return number height
function M.float_size(lines, columns, rows)
  local widest = 0
  for _, line in ipairs(lines) do
    widest = math.max(widest, vim.fn.strdisplaywidth(line))
  end
  -- a tiny editor still gets a usable float rather than a negative size
  local width = math.max(20, math.min(math.max(widest + 2, 40), columns - 6))
  local height = math.max(1, math.min(#lines, rows - 6))
  return width, height
end

return M
