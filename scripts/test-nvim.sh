#!/usr/bin/env bash
# Runs the Neovim plugin specs under tests/nvim in a clean headless nvim
set -euo pipefail

cd "$(dirname "$0")/.."

# a broken init would leave headless nvim waiting forever, so check it loads first
nvim --headless --noplugin -u tests/nvim/minimal_init.lua -c "qa!" 2>&1 | grep -q "Error" && {
  echo "tests/nvim/minimal_init.lua failed to load:"
  nvim --headless --noplugin -u tests/nvim/minimal_init.lua -c "qa!"
  exit 1
}

nvim --headless --noplugin -u tests/nvim/minimal_init.lua \
  -c "PlenaryBustedDirectory tests/nvim { minimal_init = 'tests/nvim/minimal_init.lua', sequential = true, timeout = 30000 }"
