#!/usr/bin/env sh
set -eu

root=$(git rev-parse --show-toplevel 2>/dev/null) || {
  echo 'Git preflight failed: not inside a Git repository.' >&2
  exit 1
}
cd "$root"

branch=$(git branch --show-current)
if [ -z "$branch" ]; then
  echo 'Git preflight failed: detached HEAD is not allowed for implementation work.' >&2
  exit 1
fi

case "$branch" in
  main|dev)
    echo "Git preflight failed: do not edit or commit directly on $branch." >&2
    echo 'Create a change branch from main first, for example: git switch -c feat/short-description' >&2
    exit 1
    ;;
  feat/*|fix/*|docs/*|test/*|refactor/*|chore/*|hotfix/*) ;;
  *)
    echo "Git preflight failed: '$branch' does not use an allowed change-branch prefix." >&2
    exit 1
    ;;
esac

if ! git show-ref --verify --quiet refs/heads/main; then
  echo 'Git preflight failed: local main branch is unavailable.' >&2
  exit 1
fi

if ! git merge-base --is-ancestor main HEAD; then
  echo "Git preflight failed: '$branch' was not created from the local main baseline." >&2
  exit 1
fi

echo "Git preflight passed: $branch is a change branch based on main."
