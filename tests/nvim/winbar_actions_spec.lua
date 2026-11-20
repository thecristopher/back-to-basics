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

    it("shows the ghost in green while Inde's redo is still ahead of it", function()
      local redo = { id = "x", title = "Redo", startedAt = 0, ghostSeconds = 600 }
      local text = winbar.text(redo, 5 * 60000, messages, false)
      assert.truthy(text:find("%#DiagnosticOk#󰊠 ghost 10 min", 1, true))
    end)

    it("turns the ghost amber once it gets away from Claire", function()
      local redo = { id = "x", title = "Redo", startedAt = 0, ghostSeconds = 600 }
      local text = winbar.text(redo, 11 * 60000, messages, false)
      assert.truthy(text:find("%#DiagnosticWarn#󰊠 ghost 10 min", 1, true))
    end)

    it("escapes a percent in a title so the winbar does not break", function()
      local text = winbar.text({ id = "x", title = "100% Claire" }, 0, messages, false)
      assert.truthy(text:find("100%% Claire", 1, true))
    end)
  end)

  describe("fields", function()
    it("takes the title, level, clock and pause from an opened exercise", function()
      local data =
        { id = "x", path = "/w/x.js", title = "Haligtree", level = 3, startedAt = 7, hintsLeft = 2 }
      assert.are.same({
        title = "Haligtree",
        level = 3,
        startedAt = 7,
        hintsLeft = 2,
        pausedMs = 0,
        pausedAt = false,
      }, winbar.fields(data))
    end)

    it("takes the ghost and the hint price from an opened redo", function()
      local data = { id = "x", path = "/w/x.js", startedAt = 7, ghostSeconds = 420, hintCost = 3 }
      local fields = winbar.fields(data)
      assert.are.equal(420, fields.ghostSeconds)
      assert.are.equal(3, fields.hintCost)
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

    it("takes a pass that only counts Claire's hints without touching the hints left", function()
      local fields = winbar.fields({ id = "x", ok = true, passed = 4, total = 4, hints = 0 })
      assert.are.same({ passed = 4, total = 4, ok = true }, fields.tests)
      assert.is_nil(fields.hintsLeft)
    end)

    it("ignores an answer about no exercise", function()
      assert.is_nil(winbar.fields({ xp = 40 }))
    end)
  end)

  describe("paused clock", function()
    local letter =
      { id = "node/love-letter", title = "Love letter for Inde", startedAt = 0, pausedMs = 60000 }

    it("leaves the time Claire paused out of the clock", function()
      assert.are.equal(9 * 60000, winbar.clock_ms(letter, 10 * 60000))
    end)

    it("stands still while Malenia's lesson is paused", function()
      local paused = vim.tbl_extend("force", letter, { pausedAt = 5 * 60000 })
      assert.are.equal(4 * 60000, winbar.clock_ms(paused, 30 * 60000))
    end)

    it("says the lesson is paused in the winbar", function()
      local paused = vim.tbl_extend("force", letter, { pausedAt = 5 * 60000 })
      local text = winbar.text(paused, 30 * 60000, messages, false)
      assert.truthy(text:find("⏸ 4 min · paused", 1, true))
    end)

    it("takes the pause from btb's answer and frees it on resume", function()
      local fields = winbar.fields({ id = "node/love-letter", paused = true, pausedAt = 1000 })
      assert.are.equal(1000, fields.pausedAt)
      fields = winbar.fields({ id = "node/love-letter", paused = false, pausedMs = 7000 })
      assert.are.equal(false, fields.pausedAt)
      assert.are.equal(7000, fields.pausedMs)
    end)

    it("reads json null as running", function()
      assert.are.equal(false, winbar.paused_at({ pausedAt = vim.NIL }))
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
