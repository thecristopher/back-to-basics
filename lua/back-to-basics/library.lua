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

local function act(host, entry, key)
  if library.allows(entry, key) then
    return handlers(host, entry)[key]()
  end
  -- what was asked does not fit this lesson yet, so the choices that do are offered instead
  choose_action(host, entry)
end

-- with snacks the lesson reads in the preview and each action is one key away
local function open_picker(host, lessons)
  local picker_actions, keys = {}, {}
  for _, binding in ipairs(library.KEYS) do
    picker_actions["btb_" .. binding.key] = function(picker, item)
      picker:close()
      if item then
        act(host, item.entry, binding.key)
      end
    end
    keys[binding.lhs] = "btb_" .. binding.key
  end
  Snacks.picker({
    title = host.messages.library_title .. "  " .. host.messages.library_keys,
    items = vim.tbl_map(function(entry)
      return { text = library.format(entry), file = entry.lesson, entry = entry }
    end, lessons),
    format = function(item)
      return { { item.text } }
    end,
    preview = "file",
    focus = "list",
    actions = picker_actions,
    win = { list = { keys = keys } },
  })
end

local function choose_lesson(host, lessons)
  vim.ui.select(
    lessons,
    { prompt = host.messages.library_title, format_item = library.format },
    function(entry)
      if entry then
        choose_action(host, entry)
      end
    end
  )
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
    if rawget(_G, "Snacks") and Snacks.picker then
      return open_picker(host, data.lessons)
    end
    choose_lesson(host, data.lessons)
  end, host.progress)
end

return M
