-- :checkhealth back-to-basics, everything the plugin needs before the first lesson.
local actions = require("back-to-basics.actions")
local coach_actions = require("back-to-basics.actions.coach")

local M = {}

local function plugin_opts()
  local ok, btb = pcall(require, "back-to-basics")
  return ok and btb.options and btb.options() or nil
end

local function check_executable(name, why)
  if vim.fn.executable(name) == 1 then
    return vim.health.ok(name .. " found")
  end
  vim.health.error(name .. " not found", why)
end

local function read_json(file)
  local ok, lines = pcall(vim.fn.readfile, file)
  if not ok then
    return nil
  end
  local decoded, value = pcall(vim.json.decode, table.concat(lines, "\n"))
  return decoded and value or nil
end

local function persona_file(root, config, name)
  local data_dir = actions.settings(config, root).data_dir
  for _, file in ipairs(actions.persona_files(root, data_dir, name)) do
    if vim.fn.filereadable(file) == 1 then
      return file
    end
  end
  return nil
end

local function check_persona(root, config, opts)
  local choice = coach_actions.persona_choice(opts.persona)
  local name = choice and choice.id or config.persona
  if not name or name == "" or name == "none" then
    return vim.health.info("no coach chosen, set persona in setup() or in btb.config.json")
  end
  local file = persona_file(root, config, name)
  if not file and choice and choice.character then
    return vim.health.info(
      choice.character .. " is summoned as the coach on the first btb run of the day"
    )
  end
  if not file then
    return vim.health.error("persona " .. name .. " not found", "run btb persona list")
  end
  vim.health.ok("coach " .. name .. " from " .. file)
  if not opts.portrait then
    vim.health.info("no portrait hook, the stage shows the text only")
  end
end

-- the tests run in Podman when the config asks for it, "auto" falls back to this machine without it
local function check_sandbox(config)
  local mode = config.sandbox or "off"
  if mode == "off" then
    return vim.health.info("tests run on this machine, set sandbox to auto to run them in Podman")
  end
  if vim.fn.executable("podman") ~= 1 then
    local report = mode == "podman" and vim.health.error or vim.health.warn
    return report("podman not found, sandbox is " .. mode, "install Podman or set sandbox to off")
  end
  local answer = vim.system({ "podman", "info", "--format", "{{.Host.Arch}}" }):wait(10000)
  if answer.code ~= 0 then
    local report = mode == "podman" and vim.health.error or vim.health.warn
    return report("Podman is not answering", "start it with podman machine start")
  end
  vim.health.ok("tests run in Podman, sandbox is " .. mode)
end

---Runs the checks :checkhealth back-to-basics shows.
function M.check()
  vim.health.start("back-to-basics")
  local opts = plugin_opts()
  if not opts then
    return vim.health.error("setup() has not run")
  end
  check_executable(opts.node, "btb runs on Node 22 or newer")
  check_executable(
    "claude",
    "Claude forges, briefs and reviews, see claude.command in btb.config.json"
  )
  local config_file = vim.env.BTB_CONFIG or (opts.root .. "/btb.config.json")
  local config = read_json(config_file)
  if not config then
    vim.health.warn("could not read " .. config_file .. ", btb uses its defaults")
  end
  check_persona(opts.root, config or {}, opts)
  check_sandbox(config or {})
end

return M
