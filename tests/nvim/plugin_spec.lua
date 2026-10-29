local btb = require("back-to-basics")

describe("back-to-basics setup", function()
  before_each(function()
    btb.setup({ keys = "<leader>k", forge_ahead = false })
  end)

  it("adds the :Btb command with every subcommand to complete", function()
    local commands = vim.api.nvim_get_commands({})
    assert.is_not_nil(commands.Btb)
    local completion = vim.fn.getcompletion("Btb ", "cmdline")
    assert.is_true(vim.tbl_contains(completion, "next"))
    assert.is_true(vim.tbl_contains(completion, "placement"))
  end)

  it("maps the keys under the prefix", function()
    local map = vim.fn.maparg("<leader>kn", "n", false, true)
    assert.are.equal("Next exercise", map.desc)
  end)

  it("turns completion off in a solution buffer and announces the focus", function()
    local focused
    vim.api.nvim_create_autocmd("User", {
      pattern = "BtbFocus",
      once = true,
      callback = function(event)
        focused = event.data.buf
      end,
    })
    local buf = vim.api.nvim_create_buf(false, true)
    btb.focus(buf)
    assert.are.equal(false, vim.b[buf].completion)
    assert.are.equal(buf, focused)
  end)

  it("marks a solution file under the workspace as an exercise when it is read", function()
    local root = vim.fn.tempname()
    local file = root .. "/workspace/node/love-note/solution.js"
    vim.fn.mkdir(vim.fs.dirname(file), "p")
    vim.fn.writefile({ "export const love = () => 'Inde';" }, file)
    btb.setup({ root = root, keys = false, forge_ahead = false })
    vim.cmd.edit(file)
    assert.are.equal("node/love-note", vim.b.btb_exercise)
    vim.cmd("bwipeout!")
  end)

  it("finds the exercise when the root is reached through a symlink", function()
    local real = vim.fn.tempname()
    local file = real .. "/workspace/node/anniversary/solution.js"
    vim.fn.mkdir(vim.fs.dirname(file), "p")
    vim.fn.writefile({ "export const anniversary = () => 'Malenia';" }, file)
    local link = vim.fn.tempname()
    if not vim.uv.fs_symlink(real, link, { dir = true, junction = true }) then
      return pending("this system does not allow symlinks")
    end
    btb.setup({ root = link, keys = false, forge_ahead = false })
    vim.cmd.edit(file)
    assert.are.equal("node/anniversary", vim.b.btb_exercise)
    vim.cmd("bwipeout!")
  end)
end)

describe("back-to-basics coach", function()
  local btb = require("back-to-basics")
  local coach = require("back-to-basics.coach")
  local claire =
    { id = "claire", name = "Claire Redfield", moment = "passed_clean", line = "Limpio, Inde." }

  before_each(function()
    btb.setup({ keys = "<leader>k", forge_ahead = false, coach = { speed = 1, toast_ms = 50 } })
  end)

  local function floats()
    return vim.tbl_filter(function(win)
      return vim.api.nvim_win_get_config(win).relative ~= ""
    end, vim.api.nvim_list_wins())
  end

  it("maps the lesson and the library under the prefix", function()
    assert.are.equal("Lesson with the coach", vim.fn.maparg("<leader>kk", "n", false, true).desc)
    assert.are.equal("Lesson library", vim.fn.maparg("<leader>kb", "n", false, true).desc)
  end)

  it("tells the config when the coach reacts", function()
    local heard
    vim.api.nvim_create_autocmd("User", {
      pattern = "BtbMoment",
      once = true,
      callback = function(event)
        heard = event.data
      end,
    })
    btb.react({ persona = claire })
    assert.are.equal("passed_clean", heard.moment)
    assert.are.equal(1, #floats())
  end)

  it("stays quiet once the coach is hidden", function()
    vim.wait(1000, function()
      return #floats() == 0
    end)
    coach.toggle()
    coach.say(claire)
    assert.are.equal(0, #floats())
    coach.toggle()
  end)

  it("plays the moment the coach reacts to", function()
    local played
    btb.setup({
      keys = false,
      forge_ahead = false,
      sound = function(event)
        played = event
      end,
    })
    coach.say(claire)
    assert.are.equal("passed_clean", played)
  end)

  it("closes the stage with q and says the lesson was not confirmed", function()
    local confirmed
    coach.stage(claire, { { "Malenia espera." } }, function(value)
      confirmed = value
    end)
    vim.api.nvim_feedkeys("q", "x", false)
    assert.is_false(confirmed)
  end)

  it("confirms the stage after the last page", function()
    local confirmed
    coach.stage(claire, { { "Leon llega tarde." } }, function(value)
      confirmed = value
    end)
    vim.wait(200, function()
      return vim.api.nvim_buf_get_lines(0, 0, -1, false)[1] == "Leon llega tarde."
    end)
    vim.api.nvim_feedkeys(vim.keycode("<CR>"), "x", false)
    assert.is_true(confirmed)
  end)
end)

describe("back-to-basics after a submit", function()
  local btb = require("back-to-basics")
  local cli = require("back-to-basics.cli")
  local claire = { id = "claire", name = "Claire Redfield", line = "Limpio, Inde." }
  local real_run

  local function floats()
    return vim.tbl_filter(function(win)
      return vim.api.nvim_win_get_config(win).relative ~= ""
    end, vim.api.nvim_list_wins())
  end

  local function answer(answers)
    real_run = cli.run
    cli.run = function(_, args, on_done)
      on_done(answers[args[1]])
    end
  end

  local function close_floats()
    for _, win in ipairs(floats()) do
      pcall(vim.api.nvim_win_close, win, true)
    end
  end

  after_each(function()
    cli.run = real_run
    close_floats()
  end)

  it("shows Claire's line inside the failure, with no toast beside it", function()
    btb.setup({ keys = false, forge_ahead = false, coach = { speed = 1 } })
    local failed = vim.tbl_extend(
      "force",
      { id = "node/love-notes", ok = false, text = { "✗ 1/3" } },
      {
        persona = vim.tbl_extend("force", claire, { moment = "failed", line = "Casi." }),
      }
    )
    answer({ submit = failed })
    btb.submit("node/love-notes")
    assert.are.equal(1, #floats())
    assert.are.equal("Claire Redfield: Casi.", vim.api.nvim_buf_get_lines(0, 0, 1, false)[1])
  end)

  it("takes Inde from a pass to the next briefing on a single stage", function()
    btb.setup({ keys = false, forge_ahead = false, advance_ms = 0, coach = { speed = 1 } })
    answer({
      submit = {
        id = "node/love-notes",
        title = "Notas para Inde",
        ok = true,
        outcome = "clean",
        xp = 15,
        persona = claire,
      },
      next = {
        id = "node/date-night",
        title = "Cita",
        path = "/tmp/solution.js",
        readme = "/tmp/README.md",
      },
      brief = { brief = "Hoy toca la cita con Inde." },
    })
    btb.submit("node/love-notes")
    local text
    vim.wait(1000, function()
      text = table.concat(vim.api.nvim_buf_get_lines(0, 0, -1, false), "\n")
      return text:find("Hoy toca la cita", 1, true) ~= nil
    end)
    assert.truthy(text:find("Limpio, Inde.", 1, true))
    assert.truthy(text:find("Notas para Inde", 1, true))
    assert.are.equal(1, #floats())
  end)
end)

describe("back-to-basics one exercise at a time", function()
  local btb = require("back-to-basics")
  local cli = require("back-to-basics.cli")

  it("never sends a second next while the first one is still opening", function()
    local real_run, calls, warned = cli.run, 0, false
    cli.run = function()
      calls = calls + 1
    end
    local real_notify = vim.notify
    vim.notify = function(_, level)
      warned = warned or level == vim.log.levels.WARN
    end
    btb.setup({ keys = false, forge_ahead = false })
    btb.next()
    btb.next()
    cli.run, vim.notify = real_run, real_notify
    assert.are.equal(1, calls)
    assert.is_true(warned)
  end)
end)

describe("back-to-basics progress", function()
  local btb = require("back-to-basics")
  local cli = require("back-to-basics.cli")

  local function recorder()
    local log = {}
    return log,
      function(start)
        table.insert(log, "start:" .. start.message)
        return {
          update = function(_, line)
            table.insert(log, "update:" .. line)
          end,
          done = function()
            table.insert(log, "done")
          end,
          fail = function(_, message)
            table.insert(log, "fail:" .. message)
          end,
        }
      end
  end

  it("follows btb's progress lines until the answer, then closes", function()
    local log, progress = recorder()
    local real_run = cli.run
    cli.run = function(_, _, on_done, on_progress)
      on_progress("Claude forja un ejercicio para Inde")
      on_done({ text = { "listo" } })
    end
    btb.setup({ keys = false, forge_ahead = false, progress = progress })
    btb.subcommands.today({})
    cli.run = real_run
    assert.are.same(
      { "start:Revisando tu día…", "update:Claude forja un ejercicio para Inde", "done" },
      log
    )
  end)

  it("ends the bar in red when btb answers with an error", function()
    local log, progress = recorder()
    local real_run = cli.run
    cli.run = function(_, _, on_done)
      on_done({ error = "Wesker borró el archivo" })
    end
    btb.setup({ keys = false, forge_ahead = false, progress = progress })
    btb.subcommands.status({})
    cli.run = real_run
    assert.are.equal("fail:Wesker borró el archivo", log[#log])
  end)

  it("forges ahead off the screen, so the statement stays readable", function()
    local log, progress = recorder()
    local real_run = cli.run
    local asked = {}
    cli.run = function(_, args, on_done, on_progress)
      table.insert(asked, args[1])
      if on_progress then
        on_progress("Claude forja un ejercicio de React")
      end
      if args[1] == "today" then
        return on_done({ queue = { { slot = 1, track = "react" } } })
      end
      on_done({ forged = { "count-green-herbs" } })
    end
    btb.setup({ keys = false, progress = progress })
    btb.forge_ahead()
    cli.run = real_run
    assert.are.same({ "today", "forge", "brief" }, asked)
    assert.are.same({}, log)
  end)

  it("tells the config what gets ready ahead, so it can show it somewhere small", function()
    local steps = {}
    local id = vim.api.nvim_create_autocmd("User", {
      pattern = "BtbAhead",
      callback = function(event)
        table.insert(steps, event.data.step .. ":" .. tostring(event.data.label))
      end,
    })
    local real_run = cli.run
    cli.run = function(_, args, on_done)
      if args[1] == "today" then
        return on_done({ queue = { { slot = 1, track = "react" } } })
      end
      if args[1] == "brief" then
        return on_done({ error = "Wesker se llevó la lección" })
      end
      on_done({ forged = { "count-green-herbs" } })
    end
    btb.setup({ keys = false })
    btb.forge_ahead()
    cli.run = real_run
    vim.api.nvim_del_autocmd(id)
    assert.are.same({
      "forge:Forjando el siguiente",
      "brief:Preparando la lección",
      "failed:nil",
    }, steps)
  end)
end)
