import { describe, expect, it } from "vitest";
// @ts-expect-error -- plain ESM hook script without type declarations
import { decide } from "./protect-files.mjs";

const call = (file_path: string) => decide(JSON.stringify({ tool_input: { file_path } })) as { code: number };
const w = (...parts: string[]) => ["C:", "Users", "x", "splitline", ...parts].join("\\");

describe("protect-files hook", () => {
  it.each([
    [w(".env.local"), 2],
    [w(".env"), 2],
    ["/home/x/splitline/.env.production", 2],
    [w(".env.example"), 0],
    [w("docs", "research", "01_legal-landscape-canada-bc.md"), 2],
    ["/home/x/splitline/docs/research/02.md", 2],
    [w("docs", "SPEC.md"), 0],
    [w("src", "app", "page.tsx"), 0],
  ])("%s → exit %i", (file, code) => {
    expect(call(file).code).toBe(code);
  });

  it("allows tool calls without a file path or with malformed input", () => {
    expect(decide("{}").code).toBe(0);
    expect(decide("not json").code).toBe(0);
  });
});
