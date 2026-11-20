#!/usr/bin/env node
// Stop gate: Claude may not finish a turn while typecheck, lint or unit tests fail.
// Exit 2 = keep working; stderr is shown to Claude. Claude Code ends the turn anyway after 8 consecutive blocks.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const run = (cmd, args) =>
  spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: process.platform === "win32" });

// No-op until the app is scaffolded (Phase 0).
const pkg = join(root, "package.json");
if (!existsSync(pkg) || !readFileSync(pkg, "utf8").includes('"verify"')) process.exit(0);

// Skip if nothing in src/, tests/ or scripts/ changed since the last commit (pure planning or doc turns).
const inGit = run("git", ["rev-parse", "--is-inside-work-tree"]);
if (inGit.status === 0) {
  const st = run("git", ["status", "--porcelain", "--", "src", "tests", "scripts", "package.json"]);
  if (st.status === 0 && st.stdout.trim() === "") process.exit(0);
}

const v = run("pnpm", ["-s", "verify"]);
if (v.status !== 0) {
  const out = `${v.stdout ?? ""}${v.stderr ?? ""}`.trimEnd().split("\n").slice(-40).join("\n");
  process.stderr.write(
    "pnpm verify failed. Fix the root cause before finishing (do not skip or weaken tests). Last output:\n" + out + "\n",
  );
  process.exit(2);
}
process.exit(0);
