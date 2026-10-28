-- The lesson library: every lesson forged so far, to read again, review or solve once more.
local actions = require("back-to-basics.actions")
local library = require("back-to-basics.actions.library")
local lesson = require("back-to-basics.lesson")
local ui = require("back-to-basics.ui")

local M = {}

local function read_file(file)
  local ok, lines = pcall(vim.fn.readfile, file)
  return ok and lines or {}
end

local function show_report(host, title, filetype)
  return function(data)
    if data.error then
      return host.notify(data.error, vim.log.levels.ERROR)
    end
    ui.float(actions.text_lines(data), { title = title, filetype = filetype })
  end
end

local function handlers(host, entry)
  return {
    lesson = function()
      ui.float(read_file(entry.lesson), { title = entry.title, filetype = "markdown" })
    end,
    brief = function()
      lesson.reopen(host, entry.id)
    end,
    start = function()
      host.run({ "start", entry.id }, host.open, host.progress)
    end,
    solution = function()
      vim.cmd.edit({ args = { entry.solution } })
    end,
    review = function()
      host.run({ "review", entry.id }, show_report(host, entry.title, "markdown"), host.progress)
    end,
    reveal = function()
      host.run({ "reveal", entry.id }, show_report(host, entry.title), host.progress)
    end,
    redo = function()
      host.run({ "redo", entry.id }, host.open, host.progress)
    end,
  }
end

local function choose_action(host, entry)
  local choices = library.choices(entry, host.messages)
  vim.ui.select(choices, {
    prompt = entry.title,
    format_item = function(choice)
      return choice.label
    end,
  }, function(choice)
    if choice then
      handlers(host, entry)[choice.key]()
    end
  end)
end

---Opens the library: pick a lesson, then what to do with it.
---@param host BtbHost
---@param track? string only this track's lessons
function M.open(host, track)
  host.run(track and { "lessons", track } or { "lessons" }, function(data)
    if data.error then
      return host.notify(data.error, vim.log.levels.ERROR)
    end
    if #(data.lessons or {}) == 0 then
      return host.notify(table.concat(actions.text_lines(data), "\n"))
    end
    vim.ui.select(
      data.lessons,
      { prompt = host.messages.library_title, format_item = library.format },
      function(entry)
        if entry then
          choose_action(host, entry)
        end
      end
    )
  end, host.progress)
end

return M
