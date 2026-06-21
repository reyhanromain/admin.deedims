#!/usr/bin/env sh
set -eu

root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo 'Hook setup failed: not inside a Git repository.' >&2
  exit 1
}
cd "$root"

git config core.hooksPath .githooks
chmod +x .githooks/pre-commit .githooks/pre-push scripts/git-preflight.sh
scripts/git-preflight.sh
echo 'Git hooks installed from .githooks.'
