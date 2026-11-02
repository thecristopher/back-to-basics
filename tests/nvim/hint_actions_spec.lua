local hint = require("back-to-basics.actions.hint")
local preview = require("back-to-basics.actions.preview")
local actions = require("back-to-basics.actions")

describe("hint actions", function()
  local messages = actions.messages("es")
  local hints = {
    "Empieza por la carta de Claire.",
    "Guarda las notas de Inde con `useState([])`.",
    "Malenia te espera con el return.",
  }

  it("shows Inde's first hint alone under its title", function()
    local lines = hint.lines({ hints = { hints[1] }, total = 3, cost = 5 }, messages)
    assert.are.same({ "# Pista 1 de 3 · -5 XP", "", "Empieza por la carta de Claire." }, lines)
  end)

  it("puts the new hint first and the ones already seen below", function()
    local lines = hint.lines({ hints = hints, total = 3, cost = 5 }, messages)
    assert.are.same({
      "# Pista 3 de 3 · -5 XP",
      "",
      "Malenia te espera con el return.",
      "",
      "---",
      "",
      "**Las que ya viste**",
      "",
      "1. Empieza por la carta de Claire.",
      "2. Guarda las notas de Inde con `useState([])`.",
    }, lines)
  end)

  it("lists every hint in order once they were all bought", function()
    local lines = hint.lines({ hints = { hints[1], hints[2] }, total = 2, cost = 0 }, messages)
    assert.are.same({
      "# Todas tus pistas",
      "",
      "1. Empieza por la carta de Claire.",
      "",
      "2. Guarda las notas de Inde con `useState([])`.",
    }, lines)
  end)
end)

describe("preview actions", function()
  it("finds where Claire's preview is served", function()
    local line = "Nota de amor en http://localhost:5180/, se recarga cada vez que guardas."
    assert.are.equal("http://localhost:5180/", preview.url_in(line))
  end)

  it("ignores a line without an address", function()
    assert.is_nil(preview.url_in("Claire está armando la preview..."))
  end)
end)
