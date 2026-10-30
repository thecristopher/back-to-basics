-- The fight around a solution: failing tests sit on the lines they broke at, an onsite run tells the
-- config how many tests still stand, and the reference opens beside your solution as a diff.
local actions = require("back-to-basics.actions.arena")

local M = {}

local ns = vim.api.nvim_create_namespace("back_to_basics_failures")
local review_ns = vim.api.nvim_create_namespace("back_to_basics_review")

local function buffers_of(id, redo)
  local found = {}
  for _, buf in ipairs(vim.api.nvim_list_bufs()) do
    local same = vim.api.nvim_buf_is_loaded(buf)
      and vim.b[buf].btb_exercise == id
      and (vim.b[buf].btb_redo == true) == (redo == true)
    if same then
      table.insert(found, buf)
    end
  end
  return found
end

---Puts the failing tests of a run on the solution's lines, and clears them once it passes.
---Warnings and not errors, so a failing test never counts as a broken file.
---@param data table a btb test or submit --json answer
---@param redo boolean the run graded the redo
---@param messages table<string, string>
function M.show_failures(data, redo, messages)
  if not data or not data.id or data.error then
    return
  end
  for _, buf in ipairs(buffers_of(data.id, redo)) do
    local found = actions.failure_diagnostics(data, vim.api.nvim_buf_line_count(buf), messages)
    local diagnostics = vim.tbl_map(function(item)
      return vim.tbl_extend("force", item, {
        severity = vim.diagnostic.severity.WARN,
        source = "back-to-basics",
      })
    end, found)
    vim.diagnostic.set(ns, buf, diagnostics)
  end
end

---Tells the config how an onsite fight stands after a run, through User BtbFight.
---@param data table a btb test or submit --json answer
function M.announce_fight(data)
  local fight = actions.fight(data)
  if fight then
    vim.api.nvim_exec_autocmds("User", { pattern = "BtbFight", data = fight })
  end
end

local function read_file(path)
  local ok, lines = pcall(vim.fn.readfile, path)
  return ok and table.concat(lines, "\n") or nil
end

-- Claude's remarks sit under the lines they name, so the diff reads like a review
local function anchor_review(buf, review_file)
  local review = review_file and read_file(review_file)
  vim.api.nvim_buf_clear_namespace(buf, review_ns, 0, -1)
  local line_count = vim.api.nvim_buf_line_count(buf)
  for _, anchor in ipairs(actions.review_anchors(review)) do
    if anchor.line <= line_count then
      vim.api.nvim_buf_set_extmark(buf, review_ns, anchor.line - 1, 0, {
        virt_lines = { { { "  󰍩 " .. anchor.text, "DiagnosticHint" } } },
      })
    end
  end
end

local function reference_buffer(code, filetype, title)
  local buf = vim.api.nvim_create_buf(false, true)
  vim.bo[buf].bufhidden = "wipe"
  vim.api.nvim_buf_set_lines(buf, 0, -1, false, vim.split(code, "\n", { plain = true }))
  vim.bo[buf].filetype = filetype
  vim.bo[buf].modifiable = false
  pcall(vim.api.nvim_buf_set_name, buf, title)
  return buf
end

local function open_diff(entry, code, messages)
  vim.cmd.tabnew(vim.fn.fnameescape(entry.solution))
  local solution_win = vim.api.nvim_get_current_win()
  local solution_buf = vim.api.nvim_get_current_buf()
  local filetype = vim.bo[solution_buf].filetype
  vim.cmd.diffthis()
  vim.cmd("rightbelow vsplit")
  local title = ("btb://%s/%s"):format(entry.id, messages.compare_reference)
  vim.api.nvim_win_set_buf(0, reference_buffer(code, filetype, title))
  vim.cmd.diffthis()
  anchor_review(solution_buf, entry.review)
  vim.api.nvim_set_current_win(solution_win)
end

---Opens your solution beside the reference as a diff, Claude's review on the lines it names.
---@param host BtbHost
---@param id string
function M.compare(host, id)
  host.run({ "lessons" }, function(library)
    local entry = vim.iter(library.lessons or {}):find(function(item)
      return item.id == id
    end)
    if not entry or not entry.solution then
      return host.notify(host.messages.compare_no_solution, vim.log.levels.WARN)
    end
    host.run({ "reveal", id }, function(revealed)
      if revealed.error then
        return host.notify(revealed.error, vim.log.levels.WARN)
      end
      open_diff(entry, revealed.code, host.messages)
    end)
  end, host.progress)
end

return M
