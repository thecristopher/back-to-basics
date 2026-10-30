local coach = require("back-to-basics.actions.coach")
local library = require("back-to-basics.actions.library")
local actions = require("back-to-basics.actions")

describe("coach actions", function()
  describe("persona_name", function()
    it("keeps a fixed name", function()
      assert.are.equal("claire", coach.persona_name("claire"))
    end)

    it("asks a function each time, so the coach follows the franchise", function()
      local franchise = "resident_evil"
      local pick = function()
        return franchise == "resident_evil" and "claire" or "malenia"
      end
      assert.are.equal("claire", coach.persona_name(pick))
      franchise = "elden_ring"
      assert.are.equal("malenia", coach.persona_name(pick))
    end)

    it("stays quiet when the function breaks", function()
      assert.is_nil(coach.persona_name(function()
        error("Wesker was here")
      end))
    end)
  end)

  it("adds --persona only when there is one", function()
    assert.are.same({ "today", "--persona=malenia" }, coach.with_persona({ "today" }, "malenia"))
    assert.are.same({ "today" }, coach.with_persona({ "today" }, nil))
  end)

  it("hands btb Leon's character and franchise so he can be summoned", function()
    local leon =
      { id = "leon-s-kennedy", character = "Leon S. Kennedy", franchise = "Resident Evil" }
    assert.are.same({
      "today",
      "--persona=leon-s-kennedy",
      "--character=Leon S. Kennedy",
      "--franchise=Resident Evil",
    }, coach.with_persona({ "today" }, leon))
    assert.are.equal(
      "leon-s-kennedy",
      coach.persona_name(function()
        return leon
      end)
    )
  end)

  it("ignores a coach with no id", function()
    assert.is_nil(coach.persona_choice({ character = "Hunk" }))
    assert.is_nil(coach.persona_choice(""))
  end)

  it("wraps a line on spaces without breaking words", function()
    local lines = coach.wrap("Claire leaves Inde a love note under the door", 16)
    assert.are.same({ "Claire leaves", "Inde a love note", "under the door" }, lines)
  end)

  describe("pages", function()
    it("keeps a short text on one page", function()
      assert.are.same({ { "Malenia waits." } }, coach.pages("Malenia waits.", 40, 10))
    end)

    it("starts a new page when one fills up", function()
      local text = table.concat({ "uno", "dos", "tres", "cuatro", "cinco" }, "\n")
      assert.are.same(
        { { "uno", "dos" }, { "tres", "cuatro" }, { "cinco" } },
        coach.pages(text, 40, 2)
      )
    end)

    it("leaves code blocks as they are", function()
      local text =
        "```js\nconst playlist = ['Claire', 'Inde', 'a song that is far too long to wrap'];\n```"
      local page = coach.pages(text, 20, 10)[1]
      assert.are.equal(
        "const playlist = ['Claire', 'Inde', 'a song that is far too long to wrap'];",
        page[2]
      )
    end)
  end)

  describe("reveal", function()
    it("shows the first characters across lines", function()
      local visible, done = coach.reveal({ "Leon", "Ada" }, 6)
      assert.are.same({ "Leon", "Ad" }, visible)
      assert.is_false(done)
    end)

    it("is done once every character shows, accents included", function()
      local visible, done = coach.reveal({ "Melina canción" }, 14)
      assert.are.same({ "Melina canción" }, visible)
      assert.is_true(done)
    end)
  end)

  describe("stage_layout", function()
    it("makes room for the portrait on a wide editor", function()
      local layout = coach.stage_layout(200, 50, true)
      assert.is_true(layout.portrait > 0)
      assert.are.equal(layout.width - layout.portrait - 2, layout.text_width)
    end)

    it("drops the portrait when the text would starve beside it", function()
      assert.are.equal(0, coach.stage_layout(50, 40, true).portrait)
    end)

    it("keeps the portrait on a laptop split, sized to the stage height", function()
      local layout = coach.stage_layout(70, 40, true)
      assert.are.equal(24, layout.portrait)
      assert.is_true(layout.text_width >= 36)
    end)

    it("shrinks the portrait with a short editor instead of stretching it", function()
      assert.are.equal(20, coach.stage_layout(200, 20, true).portrait)
    end)
  end)

  it("puts the toast in the top right corner", function()
    local layout = coach.toast_layout(120, 3)
    assert.are.equal(120 - layout.width - 2, layout.col)
    assert.are.equal(3, layout.height)
  end)
end)

describe("library actions", function()
  local messages = actions.messages("en")
  local solved = {
    id = "node/love-note",
    title = "Love note",
    track = "node",
    level = 1,
    concepts = { "closures" },
    state = "solved",
    lesson = "/btb/lesson.md",
    solution = "/btb/solution.js",
    solvedAt = "2026-10-27",
    unlocked = true,
  }

  local function keys(entry)
    return vim.tbl_map(function(choice)
      return choice.key
    end, library.choices(entry, messages))
  end

  it("offers everything for a solved lesson", function()
    assert.are.same({ "lesson", "brief", "solution", "review", "reveal", "redo" }, keys(solved))
  end)

  it("offers only to read and start a lesson never fought", function()
    local fresh = { id = "node/anniversary", lesson = "/btb/lesson.md", unlocked = false }
    assert.are.same({ "lesson", "brief", "start" }, keys(fresh))
  end)

  it("labels every choice in the learner's language", function()
    for _, choice in ipairs(library.choices(solved, actions.messages("es"))) do
      assert.is_string(choice.label)
    end
  end)

  it("reads an entry with its state, level and concepts", function()
    assert.are.equal("✓ [node 1] Love note  (closures)", library.format(solved))
  end)
end)
