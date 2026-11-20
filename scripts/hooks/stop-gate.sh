#!/usr/bin/env bash
# Stop gate: Claude may not finish a turn while typecheck, lint or unit tests fail.
# Exit 2 = keep working; stderr is shown to Claude. Claude Code ends the turn anyway after 8 consecutive blocks.
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

# No-op until the app is scaffolded (Phase 0).
[ -f package.json ] || exit 0
grep -q '"verify"' package.json || exit 0

# Skip if nothing in src/, tests/ or scripts/ changed since the last commit (pure planning or doc turns).
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  if [ -z "$(git status --porcelain -- src tests scripts package.json 2>/dev/null)" ]; then
    exit 0
  fi
fi

output="$(pnpm -s verify 2>&1)"
status=$?
if [ $status -ne 0 ]; then
  echo "pnpm verify failed. Fix the root cause before finishing (do not skip or weaken tests). Last output:" >&2
  printf '%s\n' "$output" | tail -n 40 >&2
  exit 2
fi
exit 0
