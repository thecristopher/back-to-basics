-- The paused lesson in the editor: the solution stays read only and its clock still until it resumes.
local M = {}

-- the exercise paused right now, nil while the lesson runs
local paused_id = nil

---The exercise paused right now, nil while the lesson runs.
---@return string|nil
function M.current()
  return paused_id
end

---Locks or frees every buffer of an exercise, so nothing gets written while its clock stands still.
---@param id string
---@param paused boolean
function M.apply(id, paused)
  if paused then
    paused_id = id
  elseif paused_id == id then
    paused_id = nil
  end
  for _, buf in ipairs(vim.api.nvim_list_bufs()) do
    if vim.api.nvim_buf_is_valid(buf) and vim.b[buf].btb_exercise == id then
      vim.b[buf].btb_paused = paused
      vim.bo[buf].modifiable = not paused
    end
  end
end

---Whether a buffer belongs to the paused lesson.
---@param buf integer
---@return boolean
function M.holds(buf)
  return vim.b[buf].btb_paused == true
end

return M
