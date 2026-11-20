#!/usr/bin/env node
// PreToolUse guard: blocks edits to secrets and to the research evidence base.
// Exit 2 = block; stderr is shown to Claude. Cross-platform (Node), no jq needed.
import { readFileSync } from "node:fs";

/** @param {string} raw */
export function decide(raw) {
  let file = "";
  try {
    file = JSON.parse(raw)?.tool_input?.file_path ?? "";
  } catch {
    return { code: 0 };
  }
  if (!file) return { code: 0 };
  const p = String(file).replaceAll("\\", "/");
  const base = p.split("/").pop() ?? "";

  if (base === ".env" || base.startsWith(".env.")) {
    if (base === ".env.example") return { code: 0 };
    return {
      code: 2,
      message: `Blocked: do not edit secret files (${file}). Put new variables in .env.example and ask Julius to set real values.`,
    };
  }
  if (p.includes("/docs/research/")) {
    return {
      code: 2,
      message:
        "Blocked: docs/research/ is the evidence base and changes only on explicit request. Propose the change in chat or in an ADR instead.",
    };
  }
  return { code: 0 };
}

if (/protect-files\.mjs$/.test(process.argv[1] ?? "")) {
  const { code, message } = decide(readFileSync(0, "utf8"));
  if (message) process.stderr.write(message + "\n");
  process.exit(code);
}
