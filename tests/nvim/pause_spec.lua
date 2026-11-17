local pause = require("back-to-basics.pause")

describe("back-to-basics pause", function()
  local letter = "node/love-letter"
  local buf

  before_each(function()
    buf = vim.api.nvim_create_buf(false, true)
    vim.b[buf].btb_exercise = letter
  end)

  after_each(function()
    pause.apply(letter, false)
    vim.api.nvim_buf_delete(buf, { force = true })
  end)

  it("locks Claire's love letter while the lesson is paused", function()
    pause.apply(letter, true)
    assert.are.equal(false, vim.bo[buf].modifiable)
    assert.is_true(pause.holds(buf))
    assert.are.equal(letter, pause.current())
  end)

  it("frees it again once Inde resumes", function()
    pause.apply(letter, true)
    pause.apply(letter, false)
    assert.is_true(vim.bo[buf].modifiable)
    assert.is_false(pause.holds(buf))
    assert.is_nil(pause.current())
  end)

  it("leaves Malenia's other exercise untouched", function()
    local other = vim.api.nvim_create_buf(false, true)
    vim.b[other].btb_exercise = "node/malenia-playlist"
    pause.apply(letter, true)
    assert.is_true(vim.bo[other].modifiable)
    vim.api.nvim_buf_delete(other, { force = true })
  end)
end)
