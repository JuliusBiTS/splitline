/**
 * CLAUDE.md: LLM code lives only in `src/llm/` and `src/app/api/`, and the API key is server-only.
 * Nothing else may import the LLM layer or the API helpers (the scripts in `scripts/` may).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.join(process.cwd(), "src");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(name) ? [p] : [];
  });
}

describe("LLM boundary", () => {
  it("only src/llm and src/app/api import the LLM layer, the SDK or the API helpers", () => {
    const offenders = files(SRC)
      .filter((f) => {
        const rel = path.relative(SRC, f).split(path.sep).join("/");
        return !rel.startsWith("llm/") && !rel.startsWith("app/api/");
      })
      .filter((f) => /from\s+["'](@\/llm\/|@anthropic-ai\/sdk|@\/app\/api\/)/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("no client component imports server-only modules", () => {
    const clientFiles = files(SRC).filter((f) => /^\s*["']use client["']/m.test(readFileSync(f, "utf8")));
    for (const f of clientFiles) expect(readFileSync(f, "utf8")).not.toMatch(/ANTHROPIC_API_KEY|CASE_TOKEN_SECRET|UPSTASH_/);
  });
});
