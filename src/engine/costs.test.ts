import { describe, expect, it } from "vitest";
import { ALL_CASES, EDGE, PRESET_CASES, run } from "../../tests/fixtures/cases";
import { joinNames } from "./costs";
import type { EngineResult } from "./index";
import { CostEstimateSchema, type CostEstimate } from "./types";

const preset = (slug: string): EngineResult => {
  const c = PRESET_CASES.find((x) => x.name.includes(slug));
  if (!c) throw new Error(`no preset ${slug}`);
  return run(c);
};
const topic = (r: EngineResult, t: CostEstimate["topic"]) => r.operatingModel.costEstimates.find((x) => x.topic === t);
const text = (r: EngineResult, t: CostEstimate["topic"]) => topic(r, t)?.lines.join(" ") ?? "";

describe("cost estimates (ADR-0018)", () => {
  it("every lever always gets at least one cost line (the direct cost is never hidden)", () => {
    for (const c of ALL_CASES) {
      const r = run(c);
      for (const e of r.operatingModel.costEstimates) expect(() => CostEstimateSchema.parse(e), c.name).not.toThrow();
      expect(r.operatingModel.costEstimates.slice(0, 3).map((e) => e.topic), c.name).toEqual([
        "decision_rights",
        "coordination",
        "exchange",
      ]);
      // The thesis direct cost (Table 4) stays on every lever card.
      for (const l of r.operatingModel.levers) expect(l.directCost.length, c.name).toBeGreaterThan(0);
    }
  });

  it("never leaks subtask IDs, thesis proposition labels or banned legal wording", () => {
    for (const c of ALL_CASES) {
      const r = run(c);
      // Fixture subtask names look like "Step s2"; remove names so only leaked IDs remain.
      const all = r.facts.subtasks.reduce(
        (t, s) => t.split(s.name).join("<name>"),
        r.operatingModel.costEstimates.flatMap((e) => e.lines).join(" "),
      );
      expect(all, c.name).not.toMatch(/\bs\d\b/);
      expect(all, c.name).not.toMatch(/\(P[1-4]\)|Table 4|Section \d/);
      expect(all, c.name).not.toMatch(/\byou must\b|\bcompliant\b/i);
    }
  });

  it("differs between presets (case-specific, not one text for all)", () => {
    const texts = PRESET_CASES.map((c) => JSON.stringify(run(c).operatingModel.costEstimates));
    expect(new Set(texts).size).toBe(texts.length);
  });

  it("claims: monthly review hours, the 60-day STP ramp and reviewer time on the 3 checked steps", () => {
    const r = preset("claims");
    expect(text(r, "coordination")).toContain("monthly split review");
    expect(text(r, "coordination")).toContain("Receive and sort claim documents and Extract receipt fields with source text run without a person only from Day 61");
    expect(text(r, "exchange")).toContain("weekly 1-hour joint session");
    expect(text(r, "review")).toContain(
      "every AI output on 3 steps: Validate expenses against coverage rules and Recommend reimbursement eligibility (high volume); Decide on the claim and write to claimant (medium volume)",
    );
    expect(text(r, "review")).toContain("largest ongoing time cost");
  });

  it("follows team setup, cadence and readiness", () => {
    expect(text(preset("contract"), "exchange")).toContain("rotating AI steward");
    expect(text(preset("hiring"), "exchange")).toContain("vendor");
    expect(text(preset("hiring"), "coordination")).toContain("quarterly split review");
    expect(text(run(EDGE.lowReadiness), "exchange")).toContain("Enablement first");
    expect(text(preset("claims"), "exchange")).not.toContain("Enablement first");
  });

  it("names the human final decision at tier III or above, and STP is zero when no step runs alone", () => {
    const clinical = preset("clinical");
    expect(text(clinical, "decision_rights")).toContain("A person makes the final decision on Check required tests and history are attached, Suggest an urgency category with reasons");
    expect(text(clinical, "review")).toContain("People keep doing 2 steps themselves");
    const hiring = preset("hiring");
    expect(text(hiring, "coordination")).toContain("Review incoming applications runs without a person only from Day 61");
  });

  it("crisis and central guardrails change the decision-rights cost", () => {
    expect(text(run(EDGE.crisis), "decision_rights")).toContain("During the crisis, one accountable owner sets the split");
    expect(text(run(EDGE.federalHighTier), "decision_rights")).toContain("ratifies each proposed split change");
  });

  it("joinNames", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["a"])).toBe("a");
    expect(joinNames(["a", "b"])).toBe("a and b");
    expect(joinNames(["a", "b", "c"])).toBe("a, b and c");
  });
});

describe("direct cost in plain words (02_* §1.7, thesis review)", () => {
  it("restates the Table 4 cost for every lever", async () => {
    const { DIRECT_COST_PLAIN, TABLE_4 } = await import("./levers");
    for (const k of ["decision_rights", "coordination", "exchange"] as const) expect(DIRECT_COST_PLAIN[k].length).toBeGreaterThan(20);
    expect(DIRECT_COST_PLAIN.decision_rights).toMatch(/automation efficiency/i);
    expect(DIRECT_COST_PLAIN.coordination).toMatch(/automation efficiency/i);
    expect(DIRECT_COST_PLAIN.exchange).toMatch(/standalone depth on each side/i);
    expect(TABLE_4.exchange.directCost).toBe("Some standalone depth on each side");
  });
});
