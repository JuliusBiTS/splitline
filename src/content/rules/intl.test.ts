import { describe, expect, it } from "vitest";
import { ALL_CASES, run } from "../../../tests/fixtures/cases";

describe("international standards", () => {
  it("ISO-42001 applies to every case as good practice at info", () => {
    for (const c of ALL_CASES) {
      const t = run(c).triggeredRules.find((x) => x.ruleId === "ISO-42001");
      expect(t?.effectiveStatus, c.name).toBe("VOLUNTARY");
      expect(t?.severity, c.name).toBe("info");
    }
  });
});
