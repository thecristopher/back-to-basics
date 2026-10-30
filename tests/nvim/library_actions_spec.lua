local library = require("back-to-basics.actions.library")

describe("back-to-basics library actions", function()
  it("lets Claire redo a lesson she already unlocked", function()
    assert.is_true(library.allows({ unlocked = true }, "redo"))
  end)

  it("keeps the reference locked until Malenia solves or skips it", function()
    assert.is_false(library.allows({ unlocked = false }, "reveal"))
  end)

  it("gives every action a key of its own", function()
    local seen = {}
    for _, binding in ipairs(library.KEYS) do
      assert.is_nil(seen[binding.lhs], binding.lhs)
      seen[binding.lhs] = true
    end
  end)
end)
