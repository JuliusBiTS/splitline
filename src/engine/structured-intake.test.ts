import { describe, expect, it } from "vitest";
import { PRESETS } from "@/content/presets";
import { computeCase } from "./index";
import { DESCRIPTION_NOT_SENT, intakeFromStructured, IntakeStructuredSchema, toStructured } from "./structured-intake";

describe("structured intake (ADR-0008)", () => {
  it("the placeholder satisfies the description length rule", () => {
    expect(DESCRIPTION_NOT_SENT.length).toBeGreaterThanOrEqual(200);
    expect(DESCRIPTION_NOT_SENT.length).toBeLessThanOrEqual(2000);
  });

  it("drops the description and still reproduces the full engine result for every preset", () => {
    for (const p of PRESETS) {
      const structured = toStructured(p.intake);
      expect(structured).not.toHaveProperty("processDescription");
      expect(IntakeStructuredSchema.safeParse(structured).success).toBe(true);
      const full = computeCase(p.intake, p.decomposition, { today: "2026-11-20" });
      const rebuilt = computeCase(intakeFromStructured(structured), p.decomposition, { today: "2026-11-20" });
      expect(rebuilt).toEqual(full);
    }
  });
});
