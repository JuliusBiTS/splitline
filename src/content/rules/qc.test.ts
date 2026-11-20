import { describe, expect, it } from "vitest";
import { EDGE, run, triggeredIds } from "../../../tests/fixtures/cases";
import { ruleCases } from "../../../tests/fixtures/rule-cases";

describe("Quebec rules", () => {
  ruleCases([
    { ruleId: "QC-L25-121", triggers: EDGE.quebecDecidesAlone, status: "IN_FORCE", severity: "action", doesNotTrigger: EDGE.quebecWithReviewHfd },
    { ruleId: "QC-AMF-AI", triggers: EDGE.quebecInsurer, status: "IN_FORCE_FUTURE", severity: "action", doesNotTrigger: EDGE.quebecDecidesAlone },
  ]);

  it("QC-L25-121: decides with review and no human final decision → info 'ensure meaningful review'", () => {
    const t = run(EDGE.quebecWithReviewNoHfd).triggeredRules.find((x) => x.ruleId === "QC-L25-121");
    expect(t?.severity).toBe("info");
    expect(t?.notes.join(" ")).toContain("Ensure the human review is meaningful");
  });

  it("QC-L25-121 needs Quebec residents", () => {
    expect(triggeredIds(EDGE.ontarioHiring25)).not.toContain("QC-L25-121");
  });
});
