import { describe, expect, it } from "vitest";
import { EDGE, run } from "../../../tests/fixtures/cases";
import { ruleCases } from "../../../tests/fixtures/rule-cases";

describe("Ontario rules", () => {
  ruleCases([
    { ruleId: "ON-ESA-AI", triggers: EDGE.ontarioHiring25, status: "IN_FORCE", severity: "action", doesNotTrigger: EDGE.ontarioHiringSmall },
  ]);

  it("headcount unset → info 'confirm headcount'", () => {
    const t = run(EDGE.ontarioHiringUnset).triggeredRules.find((x) => x.ruleId === "ON-ESA-AI");
    expect(t?.severity).toBe("info");
    expect(t?.notes.join(" ")).toContain("Confirm headcount");
  });
});
