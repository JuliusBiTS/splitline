# ADR-0011: Tooling baseline and cross-platform Claude Code hooks

- **Status:** Accepted · **Date:** 2026-11-20

## Context
The starter hooks were bash scripts that used `jq`, configured in exec form (`"args": []`). Two problems:
- On Windows, exec form spawns the command directly and cannot run a `.sh` file, so neither hook ever ran. A live Write to `.env.local` went through.
- The protect hook only matched forward-slash paths, but Windows passes paths with backslashes.

## Decision
1. **Hooks are Node ESM scripts:** `scripts/hooks/protect-files.mjs` and `scripts/hooks/stop-gate.mjs`.
   - Configured as `"command": "node", "args": ["${CLAUDE_PROJECT_DIR}/scripts/hooks/<name>.mjs"]`.
   - No jq dependency.
   - Paths are normalized to forward slashes.
   - The protect logic has unit tests.
2. **Baseline:**
   - Next.js 16.4, with `cacheComponents` on as scaffolded.
   - pnpm 12, with build scripts allowed for esbuild only.
   - Node 24 in `.nvmrc` and CI (Node 26 also works locally).
   - TypeScript strict + `noUncheckedIndexedAccess`.
   - LF line endings via `.gitattributes`.
3. **CI jobs:**
   - `verify` + `eval:engine`;
   - Playwright e2e + axe against a production build;
   - `pnpm audit --audit-level high`.

## Consequences
- Verified live on Windows: the protect hook blocks a Write to `.env.local`.
- The `START-HIER.md` steps "install jq" and "chmod +x" are no longer needed.
- The stop gate runs `pnpm verify` whenever `src/`, `tests/`, `scripts/` or `package.json` has uncommitted changes.
