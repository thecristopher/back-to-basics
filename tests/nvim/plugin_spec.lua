local btb = require("back-to-basics")

describe("back-to-basics setup", function()
  before_each(function()
    btb.setup({ keys = "<leader>k", forge_ahead = false })
  end)

  it("adds the :Btb command with every subcommand to complete", function()
    local commands = vim.api.nvim_get_commands({})
    assert.is_not_nil(commands.Btb)
    local completion = vim.fn.getcompletion("Btb ", "cmdline")
    assert.is_true(vim.tbl_contains(completion, "next"))
    assert.is_true(vim.tbl_contains(completion, "placement"))
  end)

  it("maps the keys under the prefix", function()
    local map = vim.fn.maparg("<leader>kn", "n", false, true)
    assert.are.equal("Next exercise", map.desc)
  end)

  it("turns completion off in a solution buffer and announces the focus", function()
    local focused
    vim.api.nvim_create_autocmd("User", {
      pattern = "BtbFocus",
      once = true,
      callback = function(event)
        focused = event.data.buf
      end,
    })
    local buf = vim.api.nvim_create_buf(false, true)
    btb.focus(buf)
    assert.are.equal(false, vim.b[buf].completion)
    assert.are.equal(buf, focused)
  end)

  it("marks a solution file under the workspace as an exercise when it is read", function()
    local root = vim.fn.tempname()
    local file = root .. "/workspace/node/love-note/solution.js"
    vim.fn.mkdir(vim.fs.dirname(file), "p")
    vim.fn.writefile({ "export const love = () => 'Inde';" }, file)
    btb.setup({ root = root, keys = false, forge_ahead = false })
    vim.cmd.edit(file)
    assert.are.equal("node/love-note", vim.b.btb_exercise)
    vim.cmd("bwipeout!")
  end)
end)
