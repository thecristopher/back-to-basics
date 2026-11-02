local contract = require("back-to-basics.contract")
local actions = require("back-to-basics.actions")
local winbar = require("back-to-basics.actions.winbar")
local hint = require("back-to-basics.actions.hint")

local root = vim.fn.getcwd()

describe("contracts", function()
  for _, name in ipairs(contract.NAMES) do
    it("reads the " .. name .. " sample within its contract", function()
      local schema, sample = contract.load(root, name)
      assert.is_truthy(schema)
      assert.are.same({}, contract.problems(schema, sample))
    end)
  end

  it("says where Claire's answer breaks the contract", function()
    local schema = contract.load(root, "hint")
    local problems =
      contract.problems(schema, { id = "node/claire-letters", hints = { 1 }, cost = 3 })
    table.sort(problems)
    assert.are.same({ '$.hints[0] must be "string", got integer', "$.total is missing" }, problems)
  end)

  it("folds the sampled answers into the winbar", function()
    local _, open = contract.load(root, "open")
    local _, failed = contract.load(root, "submit-failed")
    local fields = winbar.fields(open)
    assert.are.equal(open.title, fields.title)
    assert.are.equal(open.hintsLeft, fields.hintsLeft)
    assert.is_false(winbar.fields(failed).nudgeReady)
  end)

  it("shows the sampled hint and leaves the sampled day's slots to forge", function()
    local _, bought = contract.load(root, "hint")
    local lines = hint.lines(bought, actions.messages("es"))
    assert.are.equal(bought.hints[#bought.hints], lines[3])
    local _, today = contract.load(root, "today")
    assert.is_nil(actions.forge_target(today))
  end)
end)
