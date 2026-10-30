local arena = require("back-to-basics.actions.arena")
local messages = require("back-to-basics.actions").messages("en")

describe("back-to-basics arena actions", function()
  describe("solution_line", function()
    it("finds the line Claire's solution broke at", function()
      local stack = "at anniversary (file:///tmp/run-1/solution.js:12:5)"
      assert.are.equal(12, arena.solution_line(stack))
    end)

    it("never mistakes the test file for the solution", function()
      assert.is_nil(arena.solution_line("at file:///tmp/run-1/solution.test.js:4:3"))
      assert.is_nil(arena.solution_line("test_solution.py:3: AssertionError"))
    end)

    it("skips the test file and keeps looking for the solution", function()
      local trace = "test_solution.py:3: in test\nsolution.py:8: in playlist"
      assert.are.equal(8, arena.solution_line(trace))
    end)
  end)

  describe("failure_diagnostics", function()
    it("puts each failing test on the line it broke at", function()
      local data = {
        ok = false,
        failures = {
          { name = "writes Inde's love note", message = "x is not a function\n  at ...", line = 4 },
          { name = "signs it Malenia", message = "1 !== 2" },
        },
      }
      assert.are.same({
        { lnum = 3, col = 0, message = "writes Inde's love note: x is not a function" },
        { lnum = 0, col = 0, message = "signs it Malenia: 1 !== 2" },
      }, arena.failure_diagnostics(data, 10, messages))
    end)

    it("keeps a line past the end of the buffer on its last line", function()
      local data = { ok = false, failures = { { name = "date", line = 99 } } }
      assert.are.equal(4, arena.failure_diagnostics(data, 5, messages)[1].lnum)
    end)

    it("points a crash at the solution line in its stderr", function()
      local data = { ok = false, crashed = true, stderr = "SyntaxError: nope\n at solution.js:3:1" }
      local diagnostic = arena.failure_diagnostics(data, 10, messages)[1]
      assert.are.equal(2, diagnostic.lnum)
      assert.are.equal("SyntaxError: nope", diagnostic.message)
    end)

    it("says when the tests ran out of time", function()
      local data = { ok = false, timedOut = true }
      assert.are.equal(
        messages.failure_timed_out,
        arena.failure_diagnostics(data, 3, messages)[1].message
      )
    end)

    it("leaves nothing behind once Claire passes", function()
      assert.are.same({}, arena.failure_diagnostics({ ok = true }, 3, messages))
    end)
  end)

  describe("fight", function()
    it("stages an onsite run with the tests still standing", function()
      local data = { id = "node/orders", onsite = true, passed = 2, total = 5, ok = false }
      assert.are.same(
        { id = "node/orders", remaining = 3, total = 5, ok = false },
        arena.fight(data)
      )
    end)

    it("stages nothing for a regular level or a crash with no tests", function()
      assert.is_nil(arena.fight({ id = "node/date", onsite = false, passed = 1, total = 2 }))
      assert.is_nil(arena.fight({ id = "node/date", onsite = true, passed = 0, total = 0 }))
    end)
  end)

  describe("recall", function()
    it("asks the questions the recapped lessons left", function()
      local today = {
        recap = {
          {
            id = "node/closures",
            title = "Closures",
            question = "What does Malenia's letter remember?",
          },
          { id = "node/dates", title = "Dates" },
        },
      }
      assert.are.same({
        {
          id = "node/closures",
          title = "Closures",
          question = "What does Malenia's letter remember?",
        },
      }, arena.recall_questions(today))
    end)

    it("writes Inde's answers above the recap, blanks included", function()
      local text = arena.recall_text({
        { title = "Closures", question = "Why?", answer = "It keeps its scope" },
        { title = "Dates", question = "When?", answer = "" },
      }, messages)
      assert.truthy(text:find("What you remembered", 1, true))
      assert.truthy(text:find("› It keeps its scope", 1, true))
      assert.truthy(text:find("› (no answer)", 1, true))
    end)

    it("writes Malenia's feedback under each answer", function()
      local text = arena.recall_text({
        {
          title = "Closures",
          question = "Why?",
          answer = "It keeps its scope",
          feedback = "True. The scope stays, not a copy.",
        },
      }, messages)
      assert.truthy(
        text:find("› It keeps its scope\n\nTrue. The scope stays, not a copy.", 1, true)
      )
    end)

    it("writes nothing when there was nothing to ask", function()
      assert.are.equal("", arena.recall_text({}, messages))
    end)
  end)

  describe("review_anchors", function()
    it("anchors the remarks that name a line, in English or Spanish", function()
      local review =
        "## Review\n- Line 4 shadows the playlist\n- En la línea 9 Claire repite el loop\nGood job overall\nL12 could return early"
      assert.are.same({
        { line = 4, text = "Line 4 shadows the playlist" },
        { line = 9, text = "En la línea 9 Claire repite el loop" },
        { line = 12, text = "L12 could return early" },
      }, arena.review_anchors(review))
    end)
  end)
end)
