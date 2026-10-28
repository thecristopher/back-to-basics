-- back-to-basics in Neovim: the day's exercise beside its statement, tests on save, completion off
-- while you fight, a coach that briefs and reacts, and User events for the rest of the config to join.
local actions = require("back-to-basics.actions")
local coach = require("back-to-basics.coach")
local coach_actions = require("back-to-basics.actions.coach")
local cli = require("back-to-basics.cli")
local lesson = require("back-to-basics.lesson")
local library = require("back-to-basics.library")
local ui = require("back-to-basics.ui")

local M = {}

local ROOT = vim.fn.fnamemodify(debug.getinfo(1, "S").source:sub(2), ":p:h:h:h")

M.defaults = {
  -- the back-to-basics clone, where bin/btb.js lives; this plugin is that same repo
  root = ROOT,
  node = "node",
  -- prefix for the keymaps, false for none
  keys = "<leader>k",
  submit_on_save = true,
  -- forge the next new exercise in the background, so next never waits on Claude
  forge_ahead = true,
  -- false turns completion off in solution buffers, AI suggestions included
  completion = false,
  -- the coach's name, or a function that picks one each time; nil uses "persona" in btb.config.json
  persona = nil,
  coach = { enabled = true, speed = 12, toast_ms = 4500 },
  -- fun(buf, win, persona) that draws the coach's portrait on the stage
  portrait = nil,
  -- fun(event) that plays a sound: "coach_open", or the moment the coach reacts to
  sound = nil,
  -- fun({ id, title, message }) that starts a progress bar with update(message), done(message)
  -- and fail(message); without it btb's progress lines come as plain notifications
  progress = nil,
}

local opts = vim.deepcopy(M.defaults)
local forging = false
-- commands that open an exercise may wait minutes on Claude, a second one would race the first for the progress file
local OPENS = { next = true, start = true, placement = true, redo = true }
local opening = false

local function notify(msg, level)
  local options = { title = "back-to-basics", id = "back_to_basics" }
  vim.notify(msg, level or vim.log.levels.INFO, options)
end

-- a progress bar for the wait, nil when the config brings none
local function start_progress(id, message)
  if not opts.progress then
    return nil
  end
  local ok, task = pcall(opts.progress, { id = id, title = "back-to-basics", message = message })
  return ok and task or nil
end

-- the bar follows btb's progress lines and closes with the answer, an error ends it in red
local function tracked(task, on_done)
  return function(line)
    task:update(line)
  end, function(data)
    if data.error then
      task:fail(data.error)
    else
      task:done(opts.messages.ready)
    end
    on_done(data)
  end
end

---Runs btb with the coach in use.
---@param args string[]
---@param on_done fun(data: table)
---@param on_progress? fun(line: string) the learner is waiting on this answer, so it shows its progress
---@param background? string the message of a bar for work the learner is not waiting on
local function run(args, on_done, on_progress, background)
  if OPENS[args[1]] then
    if opening then
      return notify(opts.messages.still_opening, vim.log.levels.WARN)
    end
    opening = true
    local done = on_done
    on_done = function(data)
      opening = false
      done(data)
    end
  end
  local task = nil
  if on_progress then
    task = start_progress("back_to_basics", actions.working(opts.messages, args[1]))
  elseif background then
    task = start_progress("back_to_basics_ahead", background)
  end
  if task then
    on_progress, on_done = tracked(task, on_done)
  end
  local name = coach_actions.persona_name(opts.persona)
  cli.run(opts, coach_actions.with_persona(args, name), on_done, on_progress)
end

local function progress(line)
  notify(line)
end

---Asks btb something in the background with the coach in use, for configs that build on it.
---@param args string[] like { "lessons" }
---@param on_done fun(data: table)
function M.btb(args, on_done)
  run(args, on_done)
end

---Lets the coach react to a btb answer and tells the rest of the config through User BtbMoment.
---@param data table a btb --json answer
function M.react(data)
  local persona = data and data.persona
  if not persona or not persona.moment then
    return
  end
  coach.say(persona)
  vim.api.nvim_exec_autocmds("User", { pattern = "BtbMoment", data = persona })
end

-- macOS hands out /var and /private/var for the same folder, so paths are compared with symlinks
-- resolved. Only the folder is resolved, a new solution file does not exist yet.
local function real_path(path)
  local dir = vim.uv.fs_realpath(vim.fs.dirname(path))
  if not dir then
    return path
  end
  return vim.fs.normalize(dir) .. "/" .. vim.fs.basename(path)
end

local function exercise_of_buffer(buf)
  local name = vim.api.nvim_buf_get_name(buf)
  return actions.exercise_of(real_path(name), real_path(opts.workspace))
end

local function current_target()
  local buf = vim.api.nvim_get_current_buf()
  if vim.b[buf].btb_exercise then
    return vim.b[buf].btb_exercise, vim.b[buf].btb_redo == true
  end
  return exercise_of_buffer(buf)
end

local function current_id()
  return (current_target())
end

---Turns completion off in a solution buffer and lets the config add its own focus rules.
---@param buf integer
function M.focus(buf)
  if vim.b[buf].btb_focused then
    return
  end
  vim.b[buf].btb_focused = true
  if opts.completion == false then
    vim.b[buf].completion = false
    vim.b[buf].copilot_enabled = false
  end
  vim.api.nvim_exec_autocmds("User", { pattern = "BtbFocus", data = { buf = buf } })
end

-- the coach's briefing is asked for ahead too, so the lesson opens without waiting on Claude
local function brief_ahead(forged)
  local id = forged and forged.forged and forged.forged[1]
  if id then
    run({ "brief", id }, function() end, nil, opts.messages.briefing_ahead)
  end
end

---Forges the next new exercise of the day in the background when none is waiting.
function M.forge_ahead()
  if not opts.forge_ahead or forging then
    return
  end
  run({ "today" }, function(today)
    local track = actions.forge_target(today)
    if not track then
      return
    end
    forging = true
    run({ "forge", track, "--count=1" }, function(forged)
      forging = false
      brief_ahead(forged)
    end, nil, opts.messages.forging_ahead)
  end)
end

local function show(data, title, filetype)
  if data.error then
    return notify(data.error, vim.log.levels.ERROR)
  end
  ui.float(actions.text_lines(data), { title = title, filetype = filetype })
end

local function open_exercise(data)
  if data.error then
    return notify(data.error, vim.log.levels.ERROR)
  end
  if not data.path then
    return show(data, "back-to-basics")
  end
  M.focus(ui.open_exercise(data))
  notify(table.concat(actions.text_lines(data), "\n"))
  M.forge_ahead()
end

local function opened(data)
  open_exercise(data)
  M.react(data)
end

local host = {
  run = run,
  notify = notify,
  progress = progress,
  open = open_exercise,
}

---Opens the next exercise of the day, Claude forges it when needed.
---@param more? boolean add one more new exercise to the day
function M.next(more)
  run(more and { "next", "--more" } or { "next" }, opened, progress)
end

---Starts the lesson with the coach: the greeting, the briefing and then the exercise.
function M.lesson()
  lesson.start(host)
end

---Opens the lesson library.
---@param track? string
function M.lessons(track)
  library.open(host, track)
end

local function submitted(id)
  return function(data)
    local verdict = actions.verdict(data)
    if verdict == "error" then
      return notify(data.error, vim.log.levels.ERROR)
    end
    local lines = actions.text_lines(data)
    if verdict == "failed" then
      ui.float(lines, { title = id })
    else
      notify(table.concat(lines, "\n"))
    end
    M.react(data)
    vim.api.nvim_exec_autocmds("User", { pattern = "BtbResult", data = actions.event_data(data) })
    if verdict == "passed" and not data.redo then
      M.forge_ahead()
    end
  end
end

---Runs btb's tests on an exercise, the one in the current buffer by default.
---@param id? string
---@param redo? boolean grade the redo instead of the solution
function M.submit(id, redo)
  if not id then
    id, redo = current_target()
  end
  if not id then
    return notify(opts.messages.not_exercise, vim.log.levels.WARN)
  end
  notify(opts.messages.running_tests)
  run(actions.submit_args(id, redo), submitted(id), progress)
end

-- commands that act on an exercise get the current buffer's one, so btb never guesses
local function on_exercise(name, filetype)
  return function(args)
    local id = args[1] or current_id()
    run(id and { name, id } or { name }, function(data)
      show(data, name, filetype)
      M.react(data)
    end, progress)
  end
end

local function report(name)
  return function(args)
    run(vim.list_extend({ name }, args), function(data)
      show(data, name)
    end, progress)
  end
end

local function open_with(name)
  return function(args)
    run(vim.list_extend({ name }, args), opened, progress)
  end
end

local function toggle_coach()
  notify(coach.toggle() and opts.messages.coach_on or opts.messages.coach_off)
end

M.subcommands = {
  next = function(args)
    M.next(args[1] == "--more")
  end,
  start = open_with("start"),
  placement = open_with("placement"),
  redo = open_with("redo"),
  submit = function(args)
    M.submit(args[1], args[2] == "--redo")
  end,
  hint = on_exercise("hint"),
  skip = on_exercise("skip"),
  reveal = on_exercise("reveal"),
  review = on_exercise("review", "markdown"),
  lesson = function()
    M.lesson()
  end,
  brief = function(args)
    local id = args[1] or current_id()
    if not id then
      return notify(opts.messages.not_exercise, vim.log.levels.WARN)
    end
    lesson.reopen(host, id)
  end,
  lessons = function(args)
    M.lessons(args[1])
  end,
  coach = toggle_coach,
  today = report("today"),
  path = report("path"),
  status = report("status"),
  plan = report("plan"),
  list = report("list"),
  forge = report("forge"),
  learn = report("learn"),
  setup = report("setup"),
  persona = report("persona"),
}

local KEYS = {
  { "k", "lesson", "Lesson with the coach" },
  { "n", "next", "Next exercise" },
  { "N", "next --more", "One more new exercise" },
  { "s", "submit", "Submit the exercise" },
  { "h", "hint", "Next hint" },
  { "x", "skip", "Skip for today" },
  { "v", "reveal", "Reveal the reference" },
  { "r", "review", "Claude reviews the solution" },
  { "L", "brief", "The coach explains this lesson again" },
  { "b", "lessons", "Lesson library" },
  { "c", "coach", "Show or hide the coach" },
  { "t", "today", "Today's plan" },
  { "p", "path", "The path Claude drew" },
  { "S", "status", "Levels and XP" },
  { "P", "plan", "Pace and goals" },
  { "l", "list", "Every exercise" },
  { "f", "forge", "Forge ahead" },
}

local function dispatch(line)
  local args = vim.split(vim.trim(line), "%s+", { trimempty = true })
  local name = table.remove(args, 1) or "today"
  local handler = M.subcommands[name]
  if not handler then
    return notify("btb: " .. name .. "?", vim.log.levels.WARN)
  end
  handler(args)
end

local function set_keys()
  if not opts.keys then
    return
  end
  for _, key in ipairs(KEYS) do
    vim.keymap.set("n", opts.keys .. key[1], function()
      dispatch(key[2])
    end, { desc = key[3] })
  end
end

local function set_autocmds()
  local group = vim.api.nvim_create_augroup("BackToBasics", { clear = true })
  vim.api.nvim_create_autocmd({ "BufReadPost", "BufNewFile" }, {
    group = group,
    callback = function(event)
      local id, redo = exercise_of_buffer(event.buf)
      if id then
        vim.b[event.buf].btb_exercise = id
        vim.b[event.buf].btb_redo = redo
        M.focus(event.buf)
      end
    end,
  })
  vim.api.nvim_create_autocmd("BufWritePost", {
    group = group,
    callback = function(event)
      local id = vim.b[event.buf].btb_exercise
      if opts.submit_on_save and id then
        M.submit(id, vim.b[event.buf].btb_redo == true)
      end
    end,
  })
end

local function read_config(root)
  local file = vim.env.BTB_CONFIG or (root .. "/btb.config.json")
  local ok, lines = pcall(vim.fn.readfile, file)
  if not ok then
    return nil
  end
  local decoded_ok, config = pcall(vim.json.decode, table.concat(lines, "\n"))
  return decoded_ok and config or nil
end

---The options setup() settled on, for :checkhealth.
---@return table
function M.options()
  return opts
end

---Sets up the :Btb command, the keymaps, the coach and submit on save.
---@param user_opts? table overrides for M.defaults
function M.setup(user_opts)
  opts = vim.tbl_deep_extend("force", vim.deepcopy(M.defaults), user_opts or {})
  local settings = actions.settings(read_config(opts.root), opts.root)
  opts.workspace = opts.workspace or settings.workspace
  opts.messages = actions.messages(settings.language)
  host.messages = opts.messages
  coach.setup(opts.coach, opts.messages, { portrait = opts.portrait, sound = opts.sound })
  vim.api.nvim_create_user_command("Btb", function(command)
    dispatch(command.args)
  end, {
    nargs = "*",
    desc = "back-to-basics",
    complete = function()
      return vim.tbl_keys(M.subcommands)
    end,
  })
  set_keys()
  set_autocmds()
end

return M
