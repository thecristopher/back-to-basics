local actions = require("back-to-basics.actions")

describe("back-to-basics actions", function()
  describe("settings", function()
    it("puts a relative workspace under the root", function()
      local settings = actions.settings({ language = "en", workspace = "dojo" }, "/home/inde/btb")
      assert.are.same({ language = "en", workspace = "/home/inde/btb/dojo" }, settings)
    end)

    it("keeps an absolute workspace and defaults to Spanish", function()
      local settings = actions.settings({ workspace = "/tmp/claire" }, "/home/inde/btb")
      assert.are.same({ language = "es", workspace = "/tmp/claire" }, settings)
    end)

    it("works without a config file", function()
      assert.are.equal("/r/workspace", actions.settings(nil, "/r").workspace)
    end)
  end)

  it("speaks the btb language and falls back to English", function()
    assert.are.equal(actions.MESSAGES.es, actions.messages("es"))
    assert.are.equal(actions.MESSAGES.en, actions.messages("fr"))
  end)

  it("names what each command is doing, a plain word for the rest", function()
    local messages = actions.messages("es")
    assert.are.equal("Corriendo los tests…", actions.working(messages, "submit"))
    assert.are.equal("Un momento…", actions.working(messages, "setup"))
  end)

  it("always asks btb for JSON", function()
    local command = actions.command(
      { node = "node", root = "/btb" },
      { "submit", "node/love-note" }
    )
    assert.are.same({ "node", "/btb/bin/btb.js", "submit", "node/love-note", "--json" }, command)
  end)

  describe("decode", function()
    it("reads a JSON answer and turns null into nil", function()
      local data = actions.decode('{"ok": true, "dueAt": null, "id": "node/malenia"}')
      assert.are.same({ ok = true, id = "node/malenia" }, data)
    end)

    it("hands back the start of anything that is not JSON", function()
      local data, raw = actions.decode("  Error: Cannot find module  ")
      assert.is_nil(data)
      assert.are.equal("Error: Cannot find module", raw)
    end)
  end)

  it("splits output into its non empty lines", function()
    assert.are.same({ "Claude forja...", "listo" }, actions.lines("Claude forja...\n\n  \nlisto\n"))
  end)

  it("turns the report text into buffer lines", function()
    local lines = actions.text_lines({ text = { "✓ 5/5", "Limpio\n+15 XP" } })
    assert.are.same({ "✓ 5/5", "Limpio", "+15 XP" }, lines)
  end)

  describe("exercise_of", function()
    local workspace = "/home/inde/btb/workspace"

    it("finds the exercise of a solution file", function()
      local path = workspace .. "/react/like-button/solution.jsx"
      assert.are.equal("react/like-button", actions.exercise_of(path, workspace))
    end)

    it("ignores the statement and files outside the workspace", function()
      assert.is_nil(actions.exercise_of(workspace .. "/react/like-button/README.md", workspace))
      assert.is_nil(actions.exercise_of("/home/claire/love-letter/solution.js", workspace))
      assert.is_nil(actions.exercise_of(workspace .. "/node/solution.js", workspace))
    end)

    it("tells a redo apart from the first solution", function()
      local id, redo =
        actions.exercise_of(workspace .. "/node/love-note/redo/solution.js", workspace)
      assert.are.equal("node/love-note", id)
      assert.is_true(redo)
      local _, first = actions.exercise_of(workspace .. "/node/love-note/solution.js", workspace)
      assert.is_false(first)
    end)

    it("tolerates a trailing slash on the workspace", function()
      local path = workspace .. "/node/retry/solution.ts"
      assert.are.equal("node/retry", actions.exercise_of(path, workspace .. "/"))
    end)
  end)

  describe("verdict", function()
    it("tells a pass, a failure, a repeat and an error apart", function()
      assert.are.equal("passed", actions.verdict({ ok = true }))
      assert.are.equal("failed", actions.verdict({ ok = false }))
      assert.are.equal("repeat", actions.verdict({ ok = true, ["repeat"] = true }))
      assert.are.equal("error", actions.verdict({ error = "boom" }))
    end)
  end)

  it("builds the BtbResult payload Claire's config listens to", function()
    local data = {
      id = "node/date-night",
      title = "Cita con Inde",
      ok = true,
      outcome = "clean",
      xp = 15,
      levelUp = 1,
    }
    data.placement = { finished = true }
    assert.are.same({
      id = "node/date-night",
      title = "Cita con Inde",
      ok = true,
      outcome = "clean",
      xp = 15,
      level_up = 1,
      mastered = false,
      placement_finished = true,
      redo = false,
    }, actions.event_data(data))
  end)

  it("marks a redo in the BtbResult payload so the config can skip the fanfare", function()
    assert.is_true(actions.event_data({ id = "node/date-night", ok = true, redo = true }).redo)
  end)

  it("asks btb to grade the redo when the buffer is one", function()
    assert.are.same({ "submit", "node/retry" }, actions.submit_args("node/retry", false))
    assert.are.same({ "submit", "node/retry", "--redo" }, actions.submit_args("node/retry", true))
  end)

  describe("forge_target", function()
    it("picks the first slot with nothing forged yet", function()
      local today = {
        queue = {
          { slot = false, id = "node/love-note" },
          { slot = true, track = "node", ready = true },
          { slot = true, track = "react", ready = false },
        },
      }
      assert.are.equal("react", actions.forge_target(today))
    end)

    it("stays still when every slot is ready or the placement runs", function()
      assert.is_nil(
        actions.forge_target({ queue = { { slot = true, track = "node", ready = true } } })
      )
      assert.is_nil(actions.forge_target({ placement = "running", queue = { { slot = true } } }))
      assert.is_nil(actions.forge_target({ error = "offline" }))
    end)

    it("leaves a track with no path for its placement", function()
      local today =
        { undrawn = { "react" }, queue = { { slot = true, track = "react", ready = false } } }
      assert.is_nil(actions.forge_target(today))
    end)
  end)

  it("sizes a float to its widest line within the editor", function()
    local width, height = actions.float_size({ "te quiero, Inde", string.rep("x", 70) }, 200, 50)
    assert.are.equal(72, width)
    assert.are.equal(2, height)
    width, height = actions.float_size({}, 30, 4)
    assert.are.equal(24, width)
    assert.are.equal(1, height)
    width = actions.float_size({ "Malenia" }, 10, 20)
    assert.are.equal(20, width)
  end)
end)
