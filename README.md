# back-to-basics

Daily coding drills in your terminal, forged by Claude to fit you and graded by real tests.

AI made writing code fast and remembering how to write it optional. This is the gym: you solve by hand, every day. Claude is not the one solving; it is the coach that measures you, draws your path and forges each exercise for where you are today.

- **Nothing fixed.** There is no static exercise list. Claude forges exercises from your aptitude: the concepts you own, the ones that cost you and how your last rounds went.
- **Trusted before you see it.** Every exercise Claude forges is run first: its reference must pass the tests and its starter must fail them. When one does not hold, Claude gets the failure and fixes it, or it is thrown away.
- **A path drawn for you.** A placement test of rising difficulty tells Claude where you really are, and it draws your levels from there. Each level up, it redraws what comes next with the new evidence.
- **Node and React at the base, any language on top.** `btb learn rust` has Claude work out how to run Rust tests on your machine. You approve the commands before anything runs.
- **Spaced review.** Clean solves come back in 3, 7 and 21 days. Struggles come back tomorrow.
- **AI only after the fight.** `btb review` has Claude grade your solution once the tests pass.
- **Editor friendly.** Every command takes `--json`, progress goes to stderr.

## Getting started

You need Node 22+ and the [Claude Code](https://claude.com/claude-code) CLI signed in (`claude -p` must work).

```sh
git clone <this repo> back-to-basics
cd back-to-basics
npm link                  # puts `btb` on your PATH, or run `node bin/btb.js`
btb placement node        # Claude measures you and draws your Node path
btb placement react       # same for React (installs its test packages once)
btb                       # today's plan
```

## A day of practice

```sh
btb               # what is queued: reviews first, then new exercises per track
btb next          # opens the next one, Claude forges it if it does not exist yet
# edit workspace/<track>/<exercise>/solution.js in your editor
btb submit        # runs the tests
btb hint          # stuck? each hint costs XP
btb skip          # not today: it returns tomorrow and unlocks the reference
btb reveal        # compare with the reference once solved or skipped
btb review        # Claude reviews your solution once solved
btb forge         # forge ahead of time so tomorrow's next opens instantly
```

A round is **clean** when you pass with no hints and at most one failed submit. A level is passed by solving its target number of exercises clean.

## Learning any language

```sh
btb learn go --goal="backend services at a big tech company"
# Claude proposes how to check and run Go tests on your machine, and shows the commands
btb setup go --yes        # you approve them, btb proves them with a tiny sample
btb placement go          # then the same loop as any track
```

If the toolchain is missing, `setup` tells you what to install. If the commands do not work, `btb learn go --again` has Claude rewrite them with the errors in hand.

## Commands

| Command | What it does |
|---|---|
| `btb today` | Today's queue, streak and XP. The default. |
| `btb next [--more]` | Opens the next pending exercise, forging it when needed. `--more` adds one. |
| `btb start <id>` | Opens a specific exercise (`node/group-by-key` or just `group-by-key`). |
| `btb submit [id]` | Runs the tests against your solution. |
| `btb hint [id]` | Reveals the next hint. None during placement. |
| `btb skip [id]` | Leaves it for tomorrow and unlocks its reference. |
| `btb reveal [id]` | Prints the reference solution, once solved or skipped. |
| `btb review [id]` | Claude reviews your solution, once solved. |
| `btb placement [track] [--restart]` | Probes of rising difficulty, then Claude draws the path. |
| `btb path [track] [--redraw]` | The path Claude drew, with the reason it starts where it does. |
| `btb forge [track] [--count=n]` | Forges exercises for the current level ahead of time. |
| `btb learn <language> [--goal=...] [--again]` | A new track for any language. |
| `btb setup [track] --yes` | Approves a learned language and proves its toolchain. |
| `btb status` | Levels per track, XP, streak, mastery. |
| `btb plan` | When each level lands at your pace, and how your goals look. |
| `btb list` | Everything forged and where you stand on it. |

## Configuration

`btb.config.json` at the repo root (or the file `$BTB_CONFIG` points to):

| Key | Default | Meaning |
|---|---|---|
| `language` | `"es"` | Language of the CLI and of everything Claude writes: `es` or `en`. |
| `flavor` | `"js"` | `"ts"` forges TypeScript exercises for Node and React. Node strips the types, no build step. |
| `tracks` | `["node", "react"]` | Bundled tracks, in path order. Tracks from `btb learn` are added after them. |
| `dailyNew` | `2` | New exercises per day, shared by the tracks in turns. |
| `dailyReviews` | `3` | Reviews per day at most. |
| `daysPerWeek` | `6` | Practice days a week, used by `btb plan`. |
| `dailyGoalXp` | `40` | The XP you aim for each day. |
| `cleanMaxFailures` | `1` | Failed submits that still count as a clean round. |
| `placementSize` | `5` | Probes in a placement test. |
| `forgeBatch` | `2` | Exercises forged per call, the extra ones wait for the next day. |
| `forgeRetries` | `2` | Times Claude may fix an exercise that failed validation. |
| `theme` | `""` | What test data should be about, passed to Claude as is. |
| `testTimeoutMs` | `15000` | Kills a run that takes longer, an infinite loop for example. |
| `workspace` | `"workspace"` | Where your solutions live. Ignored by git. |
| `dataDir` | `".btb"` | Progress, paths, forged exercises and runtimes. Ignored by git. |
| `claude.command` | `["claude", "-p"]` | Any command that reads a prompt on stdin and prints the answer. |
| `claude.timeoutMs` | `300000` | How long one Claude call may take. |
| `goals` | `[]` | `{ "title", "track", "level", "by": "YYYY-MM-DD" }`, checked by `btb plan`. |

## Neovim

This repo is also a Neovim plugin (0.10 or newer). Point lazy.nvim at your clone:

```lua
{
  dir = "~/code/back-to-basics",
  name = "back-to-basics",
  event = "VeryLazy",
  opts = {},
}
```

`<leader>kn` opens the day's next exercise with its statement on the right, and saving the solution runs the tests. Completion is off in solution buffers, AI suggestions included, because you are here to fight by hand. When the next new exercise is not forged yet, the plugin has Claude forge it in the background, so `next` opens instantly.

| Key | Does |
|---|---|
| `<leader>kn` / `kN` | Next exercise / one more new one |
| `<leader>ks` | Submit (also on every save) |
| `<leader>kh` / `kx` | Hint / skip for today |
| `<leader>kv` / `kr` | Reveal the reference / Claude reviews your solution |
| `<leader>kt` `kp` `kS` `kP` `kl` | Today, path, status, plan, list |
| `<leader>kf` | Forge ahead |

`:Btb <command> [args]` runs any btb command, `:Btb placement react` for example.

| Option | Default | Meaning |
|---|---|---|
| `root` | this repo | The back-to-basics clone. |
| `node` | `"node"` | Node to run btb with. |
| `keys` | `"<leader>k"` | Prefix of the keymaps, `false` for none. |
| `submit_on_save` | `true` | Run the tests on every save of a solution. |
| `forge_ahead` | `true` | Forge the next new exercise in the background. |
| `completion` | `false` | `false` turns completion off in solution buffers (sets `b:completion` and `b:copilot_enabled`). |

Two `User` events let the rest of your config join in:

```lua
vim.api.nvim_create_autocmd("User", {
  pattern = "BtbResult",
  callback = function(event)
    -- event.data: { id, ok, outcome = "clean" | "struggled", xp, level_up, mastered, placement_finished }
    if event.data.ok then
      vim.notify("Solved " .. event.data.id)
    end
  end,
})

vim.api.nvim_create_autocmd("User", {
  pattern = "BtbFocus",
  -- event.data.buf is a solution buffer: switch off anything else that would help too much
  callback = function(event) end,
})
```

## How it fits together

```
tracks/       seeds of the bundled tracks: focus and suggested stages, Claude adapts them
profiles/     how to run tests per language: files, command, report format, runtime
examples/     hand written exercises, the quality bar Claude is shown and the engine's fixtures
src/actions/  pure logic: scheduling, levels, placement, aptitude, prompts, validation
src/lib/      disk, processes and Claude: runner, forge, architect
src/commands/ one file per group of commands
lua/          the Neovim plugin, pure logic in lua/back-to-basics/actions
```

A language profile names the solution and test files, the test command (with `{test}`, `{dir}`, `{node}` placeholders) and how to read its verdict: `node-test`, `vitest-json`, `tap` or `exit-code`. React's profile installs Vitest, jsdom and Testing Library once, under `.btb/runtimes/react`. Profiles Claude writes for other languages may only use `tap` or `exit-code`, and stay unapproved until `btb setup --yes`.

Tests always run in a fresh folder holding only the solution and the test, and the whole process tree is killed at the timeout. They still run code Claude wrote on your machine, which is the point of the tool, so read what `btb setup` shows you before approving a language.

## Development

```sh
npm test                          # unit and end to end tests, with a fake Claude
BTB_TEST_RUNTIMES=1 npm test      # also installs React's runtime and runs its examples
./scripts/test-nvim.sh            # the Neovim plugin specs (plenary.nvim, or PLENARY_DIR)
```
