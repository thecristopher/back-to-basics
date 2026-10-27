-- back-to-basics in Neovim: the day's exercise beside its statement, tests on save,
-- completion off while you fight, and a User BtbResult event for the rest of the config to celebrate.
local actions = require("back-to-basics.actions")
local cli = require("back-to-basics.cli")
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
}

local opts = vim.deepcopy(M.defaults)
local forging = false

local function notify(msg, level)
  local options = { title = "back-to-basics", id = "back_to_basics" }
  vim.notify(msg, level or vim.log.levels.INFO, options)
end

local function run(args, on_done, on_progress)
  cli.run(opts, args, on_done, on_progress)
end

local function progress(line)
  notify(line)
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

local function current_id()
  local buf = vim.api.nvim_get_current_buf()
  return vim.b[buf].btb_exercise or exercise_of_buffer(buf)
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
    run({ "forge", track, "--count=1" }, function()
      forging = false
    end)
  end)
end

local function show(data, title, filetype)
  if data.error then
    return notify(data.error, vim.log.levels.ERROR)
  end
  ui.float(actions.text_lines(data), { title = title, filetype = filetype })
end

local function opened(data)
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

---Opens the next exercise of the day, Claude forges it when needed.
---@param more? boolean add one more new exercise to the day
function M.next(more)
  run(more and { "next", "--more" } or { "next" }, opened, progress)
end

---Runs btb's tests on an exercise, the one in the current buffer by default.
---@param id? string
function M.submit(id)
  id = id or current_id()
  if not id then
    return notify(opts.messages.not_exercise, vim.log.levels.WARN)
  end
  notify(opts.messages.running_tests)
  run({ "submit", id }, function(data)
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
    vim.api.nvim_exec_autocmds("User", { pattern = "BtbResult", data = actions.event_data(data) })
    if verdict == "passed" then
      M.forge_ahead()
    end
  end, progress)
end

-- commands that act on an exercise get the current buffer's one, so btb never guesses
local function on_exercise(name, filetype)
  return function(args)
    local id = args[1] or current_id()
    run(id and { name, id } or { name }, function(data)
      show(data, name, filetype)
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

M.subcommands = {
  next = function(args)
    M.next(args[1] == "--more")
  end,
  start = open_with("start"),
  placement = open_with("placement"),
  submit = function(args)
    M.submit(args[1])
  end,
  hint = on_exercise("hint"),
  skip = on_exercise("skip"),
  reveal = on_exercise("reveal"),
  review = on_exercise("review", "markdown"),
  today = report("today"),
  path = report("path"),
  status = report("status"),
  plan = report("plan"),
  list = report("list"),
  forge = report("forge"),
  learn = report("learn"),
  setup = report("setup"),
}

local KEYS = {
  { "n", "next", "Next exercise" },
  { "N", "next --more", "One more new exercise" },
  { "s", "submit", "Submit the exercise" },
  { "h", "hint", "Next hint" },
  { "x", "skip", "Skip for today" },
  { "v", "reveal", "Reveal the reference" },
  { "r", "review", "Claude reviews the solution" },
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
      local id = exercise_of_buffer(event.buf)
      if id then
        vim.b[event.buf].btb_exercise = id
        M.focus(event.buf)
      end
    end,
  })
  vim.api.nvim_create_autocmd("BufWritePost", {
    group = group,
    callback = function(event)
      local id = vim.b[event.buf].btb_exercise
      if opts.submit_on_save and id then
        M.submit(id)
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

---Sets up the :Btb command, the keymaps and submit on save.
---@param user_opts? table overrides for M.defaults
function M.setup(user_opts)
  opts = vim.tbl_deep_extend("force", vim.deepcopy(M.defaults), user_opts or {})
  local settings = actions.settings(read_config(opts.root), opts.root)
  opts.workspace = opts.workspace or settings.workspace
  opts.messages = actions.messages(settings.language)
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
