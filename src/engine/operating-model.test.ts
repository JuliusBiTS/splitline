import { describe, expect, it } from "vitest";
import { ALL_CASES, PRESET_CASES, run } from "../../tests/fixtures/cases";
import { computeCase } from "./index";
import { OperatingModelSchema, RolloutPlanSchema } from "./types";

describe("operating model (SPEC §7.4)", () => {
  it("validates against the schema for every fixture and is always a starting split", () => {
    for (const c of ALL_CASES) {
      const r = run(c);
      expect(() => OperatingModelSchema.parse(r.operatingModel), c.name).not.toThrow();
      expect(() => RolloutPlanSchema.parse(r.rollout), c.name).not.toThrow();
      expect(r.operatingModel.isStartingSplit).toBe(true);
      expect(r.operatingModel.split.map((s) => s.subtaskId)).toEqual(r.facts.subtasks.map((s) => s.id));
    }
  });

  it("is deterministic and depends on the injected today only through nextReviewDate", () => {
    for (const c of PRESET_CASES) {
      const a = computeCase(c.intake, c.decomposition, { today: "2026-11-20" });
      const b = computeCase(c.intake, c.decomposition, { today: "2027-03-31" });
      expect(computeCase(c.intake, c.decomposition, { today: "2026-11-20" })).toEqual(a);
      expect({ ...b.operatingModel, nextReviewDate: "" }).toEqual({ ...a.operatingModel, nextReviewDate: "" });
      expect(b.operatingModel.nextReviewDate).not.toBe(a.operatingModel.nextReviewDate);
    }
  });

  it("the operating model never changes tier, rules or verdict (evaluation order, ADR-0007)", () => {
    for (const c of PRESET_CASES) {
      const a = computeCase(c.intake, c.decomposition, { today: "2026-11-20" });
      const b = computeCase({ ...c.intake, crisisContext: true, readiness: "low", proposedKpis: [] }, c.decomposition, {
        today: "2026-11-20",
      });
      expect(b.tier).toEqual(a.tier);
      expect(b.verdict).toEqual(a.verdict);
    }
  });
});
