local winbar = require("back-to-basics.actions.winbar")
local messages = require("back-to-basics.actions").messages("en")

describe("back-to-basics winbar actions", function()
  describe("elapsed", function()
    it("counts Claire's fight in minutes", function()
      assert.are.equal("12 min", winbar.elapsed(12 * 60000 + 30000))
    end)

    it("switches to hours once Malenia passes the hour", function()
      assert.are.equal("1 h 05", winbar.elapsed(65 * 60000))
    end)
  end)

  describe("text", function()
    local info = {
      id = "node/love-note",
      title = "Love note for Inde",
      level = 2,
      startedAt = 0,
      hintsLeft = 1,
      tests = { passed = 3, total = 5, ok = false },
    }

    it("shows the title, level, clock, hints and the last run", function()
      local text = winbar.text(info, 12 * 60000, messages, false)
      assert.truthy(text:find("Love note for Inde", 1, true))
      assert.truthy(text:find("level 2", 1, true))
      assert.truthy(text:find("12 min", 1, true))
      assert.truthy(text:find("1 hints", 1, true))
      assert.truthy(text:find("%#DiagnosticError#✗ 3/5", 1, true))
    end)

    it("puts the keys on the right with the leader as a space", function()
      local text = winbar.text(info, 0, messages, "<leader>k")
      assert.truthy(text:find("%=", 1, true))
      assert.truthy(text:find("␣k  s submit", 1, true))
    end)

    it("escapes a percent in a title so the winbar does not break", function()
      local text = winbar.text({ id = "x", title = "100% Claire" }, 0, messages, false)
      assert.truthy(text:find("100%% Claire", 1, true))
    end)
  end)

  describe("fields", function()
    it("takes the title, level and clock from an opened exercise", function()
      local data =
        { id = "x", path = "/w/x.js", title = "Haligtree", level = 3, startedAt = 7, hintsLeft = 2 }
      assert.are.same(
        { title = "Haligtree", level = 3, startedAt = 7, hintsLeft = 2 },
        winbar.fields(data)
      )
    end)

    it("takes the tests from a run", function()
      local fields = winbar.fields({ id = "x", ok = true, passed = 5, total = 5 })
      assert.are.same({ passed = 5, total = 5, ok = true }, fields.tests)
    end)

    it("counts the hints left after a hint", function()
      local fields = winbar.fields({ id = "x", hints = { "one" }, total = 3 })
      assert.are.equal(2, fields.hintsLeft)
      assert.is_nil(fields.tests)
    end)

    it("ignores an answer about no exercise", function()
      assert.is_nil(winbar.fields({ xp = 40 }))
    end)
  end)

  describe("save_mode", function()
    it("tries the tests by default", function()
      assert.are.equal("test", winbar.save_mode(nil))
    end)

    it("keeps the old submit_on_save working", function()
      assert.are.equal("submit", winbar.save_mode({ submit_on_save = true }))
      assert.is_false(winbar.save_mode({ submit_on_save = false }))
    end)

    it("lets on_save win over the old option", function()
      assert.are.equal("test", winbar.save_mode({ on_save = "test", submit_on_save = true }))
    end)
  end)
end)
