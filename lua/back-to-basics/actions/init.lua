-- Pure pieces of the Neovim plugin: the btb command line, its JSON answers and the workspace paths.
local M = {}

M.MESSAGES = {
  es = {
    not_exercise = "Este buffer no es un ejercicio de back-to-basics.",
    running_tests = "Corriendo los tests...",
    no_node = "No pude correr btb: %s",
    no_json = "btb no respondió con JSON: %s",
    coach = "Coach",
    still_opening = "Todavía estoy preparando el ejercicio, dame un momento.",
    working = "Un momento…",
    working_today = "Revisando tu día…",
    working_next = "Preparando tu ejercicio…",
    working_placement = "Preparando tu evaluación…",
    working_submit = "Corriendo los tests…",
    working_brief = "Tu coach prepara la lección…",
    working_review = "Claude revisa tu solución…",
    working_lessons = "Abriendo tus lecciones…",
    ready = "Listo",
    ahead_forge = "Forjando el siguiente",
    ahead_brief = "Preparando la lección",
    coach_on = "El coach vuelve.",
    coach_off = "El coach se queda callado.",
    stage_keys = "<CR> sigue · h atrás · q cierra",
    stage_start = "Cuando quieras, <CR> y abrimos el ejercicio.",
    library_title = "Lecciones",
    library_lesson = "Leer la lección",
    library_brief = "Que el coach me la explique",
    library_start = "Abrir el ejercicio",
    library_solution = "Abrir mi solución",
    library_review = "Ver la revisión de Claude",
    library_reveal = "Ver la referencia",
    library_redo = "Resolverlo otra vez",
    clean = "Limpio",
    struggled = "Con batalla",
  },
  en = {
    not_exercise = "This buffer is not a back-to-basics exercise.",
    running_tests = "Running the tests...",
    no_node = "Could not run btb: %s",
    no_json = "btb did not answer with JSON: %s",
    coach = "Coach",
    still_opening = "Still getting the exercise ready, give me a moment.",
    working = "One moment…",
    working_today = "Checking your day…",
    working_next = "Getting your exercise ready…",
    working_placement = "Getting your placement ready…",
    working_submit = "Running the tests…",
    working_brief = "Your coach gets the lesson ready…",
    working_review = "Claude reviews your solution…",
    working_lessons = "Opening your lessons…",
    ready = "Ready",
    ahead_forge = "Forging the next one",
    ahead_brief = "Briefing the next one",
    coach_on = "The coach is back.",
    coach_off = "The coach goes quiet.",
    stage_keys = "<CR> next · h back · q close",
    stage_start = "When you are ready, <CR> and we open the exercise.",
    library_title = "Lessons",
    library_lesson = "Read the lesson",
    library_brief = "Have the coach walk me through it",
    library_start = "Open the exercise",
    library_solution = "Open my solution",
    library_review = "See Claude's review",
    library_reveal = "See the reference",
    library_redo = "Solve it again",
    clean = "Clean",
    struggled = "Hard fought",
  },
}

---The plugin's own strings in the language btb is set to, English when it is not translated.
---@param language string|nil
---@return table<string, string>
function M.messages(language)
  return M.MESSAGES[language] or M.MESSAGES.en
end

---What the progress bar says while a btb command works.
---@param messages table<string, string>
---@param command string
---@return string
function M.working(messages, command)
  return messages["working_" .. command] or messages.working
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
---@return string|nil id
---@return boolean redo the file is a redo, under the exercise's redo folder
function M.exercise_of(path, workspace)
  local prefix = workspace:gsub("/+$", "") .. "/"
  if path:sub(1, #prefix) ~= prefix then
    return nil, false
  end
  local relative = path:sub(#prefix + 1)
  local track, slug, file = relative:match("^([^/]+)/([^/]+)/redo/([^/]+)$")
  local redo = track ~= nil
  if not redo then
    track, slug, file = relative:match("^([^/]+)/([^/]+)/([^/]+)$")
  end
  if not track or not file:match("^solution%.") then
    return nil, false
  end
  return track .. "/" .. slug, redo
end

---The btb arguments of a submit, with --redo for a redo.
---@param id string
---@param redo boolean|nil
---@return string[]
function M.submit_args(id, redo)
  return redo and { "submit", id, "--redo" } or { "submit", id }
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

---What follows a submit: the day's summary when it ended, the next exercise when it passed, nil otherwise.
---A redo and a second solve the same day stay where they are.
---@param data table btb submit --json
---@param auto_advance boolean
---@return "debrief"|"advance"|nil
function M.after_submit(data, auto_advance)
  if M.verdict(data) ~= "passed" or data.redo then
    return nil
  end
  if data.day then
    return "debrief"
  end
  return auto_advance and "advance" or nil
end

---One line with how the round went, for the stage that takes the learner to the next exercise.
---@param messages table<string, string>
---@param data table btb submit --json
---@return string
function M.pass_line(messages, data)
  local outcome = data.outcome == "clean" and messages.clean or messages.struggled
  return ("✓ %s · %s · +%d XP"):format(data.title or data.id, outcome, data.xp or 0)
end

---The coach's line on top of a report float, so the coach never needs a toast beside it.
---@param data table a btb --json answer
---@param enabled boolean the coach is shown
---@return string[] empty when the coach has nothing to say
function M.coach_lines(data, enabled)
  local persona = data.persona
  if not enabled or not persona or not persona.line then
    return {}
  end
  return { persona.name .. ": " .. persona.line, "" }
end

---Payload of the User BtbResult event, so the rest of the config can react to a submit.
---@param data table btb submit --json
---@return { id: string, title: string|nil, ok: boolean, outcome: string|nil, xp: number, level_up: number|nil, mastered: boolean, placement_finished: boolean, redo: boolean }
function M.event_data(data)
  local placement = type(data.placement) == "table" and data.placement or {}
  return {
    id = data.id,
    title = data.title,
    ok = data.ok == true,
    outcome = data.outcome,
    xp = data.xp or 0,
    level_up = data.levelUp,
    mastered = data.mastered == true,
    placement_finished = placement.finished == true,
    redo = data.redo == true,
  }
end

---The track to forge for ahead of time: the first slot of the day with nothing forged yet.
---A track with no path waits for its placement, forging would draw one blind.
---@param today table btb today --json
---@return string|nil
function M.forge_target(today)
  if today.error or today.placement == "running" then
    return nil
  end
  local undrawn = today.undrawn or {}
  for _, item in ipairs(today.queue or {}) do
    if item.slot and not item.ready and not vim.tbl_contains(undrawn, item.track) then
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
