local active = require("back-to-basics.actions.active")

describe("active clock", function()
  it("counts the time between signs of life while Inde works on Claire's letter", function()
    local clock = active.new()
    active.touch(clock, 100)
    active.touch(clock, 130, true)
    active.touch(clock, 160, true)
    assert.are.same({ seconds = 60, edits = 2 }, active.take(clock))
  end)

  it("leaves a long gap out, a pause is not work", function()
    local clock = active.new()
    active.touch(clock, 100)
    active.touch(clock, 100 + active.IDLE_SECONDS + 1)
    active.touch(clock, 100 + active.IDLE_SECONDS + 11)
    assert.are.equal(10, active.take(clock).seconds)
  end)

  it("starts over after the editor loses focus", function()
    local clock = active.new()
    active.touch(clock, 100)
    active.pause(clock)
    active.touch(clock, 120)
    assert.are.equal(0, active.take(clock).seconds)
  end)

  it("hands each run only what was counted since the last one", function()
    local clock = active.new()
    active.touch(clock, 0)
    active.touch(clock, 30.5, true)
    assert.are.same({ seconds = 30, edits = 1 }, active.take(clock))
    active.touch(clock, 40)
    assert.are.same({ seconds = 10, edits = 0 }, active.take(clock))
  end)

  it("adds the activity to Malenia's submit only when there was some", function()
    assert.are.same(
      { "submit", "node/runes" },
      active.args({ "submit", "node/runes" }, { seconds = 0, edits = 0 })
    )
    assert.are.same(
      { "submit", "node/runes", "--active=42", "--edits=7" },
      active.args({ "submit", "node/runes" }, { seconds = 42, edits = 7 })
    )
  end)
end)
