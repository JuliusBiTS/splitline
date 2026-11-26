import { describe, expect, it } from "vitest";
import { getPreset } from "@/content/presets";
import { ALL_CASES, EDGE, makeCase, PLAIN_DECOMPOSITION, run, subtask, TEST_TODAY } from "../../tests/fixtures/cases";
import { computeCase } from "./index";
import { TABLE_4 } from "./levers";
import { ROLLOUT_PHASE_TITLES, selectRolloutKpis } from "./rollout";

const preset = (slug: string) => {
  const p = getPreset(slug);
  if (!p) throw new Error(slug);
  return computeCase(p.intake, p.decomposition, { today: TEST_TODAY });
};

describe("90-day rollout (SPEC §7.5)", () => {
  it("has the three phases in order with deliverables, KPIs and gate criteria", () => {
    for (const c of ALL_CASES) {
      const r = run(c).rollout;
      expect(r.phases.map((p) => [p.days, p.title])).toEqual([
        ["Days 1–30", ROLLOUT_PHASE_TITLES.foundation],
        ["Days 31–60", ROLLOUT_PHASE_TITLES.shadow_pilot],
        ["Days 61–90", ROLLOUT_PHASE_TITLES.controlled_scale],
      ]);
      for (const p of r.phases) {
        expect(p.deliverables.length, c.name).toBeGreaterThan(0);
        expect(p.kpis).toHaveLength(3);
        expect(p.gateCriteria.length).toBeGreaterThan(0);
      }
    }
  });

  it("KPIs always include one efficiency, one augmentation-value and one learning-loop KPI", () => {
    for (const c of ALL_CASES) expect(run(c).rollout.kpis.map((k) => k.kind)).toEqual(["efficiency", "augmentation_value", "learning_loop"]);
  });

  it("uses the user's KPI where one is classified, else a suggested one", () => {
    const k = selectRolloutKpis(["Straight-through processing rate", "Adjuster corrections per 100 claims"]);
    expect(k).toEqual([
      { kind: "efficiency", name: "Straight-through processing rate", fromUser: true },
      { kind: "augmentation_value", name: "Decision quality on non-routine cases (sampled expert review)", fromUser: false },
      { kind: "learning_loop", name: "Adjuster corrections per 100 claims", fromUser: true },
    ]);
    expect(selectRolloutKpis([]).every((x) => !x.fromUser)).toBe(true);
    // A KPI matching two kinds fills one slot only.
    const both = selectRolloutKpis(["Corrections on complex cases"]);
    expect(both.filter((x) => x.fromUser)).toHaveLength(1);
    expect(new Set(both.map((x) => x.name)).size).toBe(3);
  });

  it("the monitoring plan carries each lever's Table 4 signal and warning sign", () => {
    const r = run(EDGE.noPersonalData).rollout;
    expect(r.monitoringPlan).toEqual(
      (["decision_rights", "coordination", "exchange"] as const).map((lever) => ({
        lever,
        monitoringIndicator: TABLE_4[lever].monitoringIndicator,
        warningIndicator: TABLE_4[lever].warningIndicator,
      })),
    );
  });

  it("deliverables come from triggered rules (action or blocker) and from all three levers", () => {
    const r = preset("claims-document-intake");
    const foundation = r.rollout.phases[0].deliverables;
    const ruleIds = foundation.flatMap((d) => (d.source.kind === "rule" ? [d.source.ruleId] : []));
    const actionRules = r.triggeredRules.filter((t) => t.severity !== "info").map((t) => t.ruleId);
    expect(ruleIds).toEqual(actionRules);
    const levers = new Set(foundation.flatMap((d) => (d.source.kind === "lever" ? [d.source.lever] : [])));
    expect([...levers].sort()).toEqual(["coordination", "decision_rights", "exchange"]);
    // Info rules are not deliverables in Days 1–30.
    const infoOnly = r.triggeredRules.filter((t) => t.severity === "info").map((t) => t.ruleId);
    for (const id of infoOnly) expect(ruleIds).not.toContain(id);
  });

  it("a blocker gates the shadow pilot on its redesign path (hiring preset)", () => {
    const r = preset("hiring-and-sentiment");
    const f = r.rollout.phases[0];
    expect(f.deliverables.some((d) => d.text.startsWith("Redesign for") && d.source.kind === "rule" && d.source.ruleId === "BC-PIPA-MON")).toBe(true);
    expect(f.gateCriteria[0]).toContain("Every blocker is cleared through its redesign path");
    // Human steps stay with people in the pilot.
    expect(r.rollout.phases[1].deliverables.some((d) => d.text.startsWith("Keep Score and rank applicants, Auto-reject below cut-off, Flag low performers with people"))).toBe(true);
  });

  it("no blockers → no redesign gate; info-only case → no 'owner and dated plan' gate", () => {
    const go = run(EDGE.noPersonalData).rollout.phases[0].gateCriteria;
    expect(go.join(" ")).not.toContain("redesign path");
    expect(go.join(" ")).not.toContain("dated plan");
  });

  it("proposed bills appear only as 'Prepare for (proposed)' in Days 61–90", () => {
    const r = preset("contract-clause-review");
    const scale = r.rollout.phases[2].deliverables;
    expect(scale.some((d) => d.source.kind === "rule" && d.source.ruleId === "FED-C36-XB" && d.text.startsWith("Prepare for (proposed)"))).toBe(true);
    const foundationIds = r.rollout.phases[0].deliverables.flatMap((d) => (d.source.kind === "rule" ? [d.source.ruleId] : []));
    expect(foundationIds).not.toContain("FED-C36-XB");
  });

  it("tier ≥ III adds the human-final-decision gate to the pilot", () => {
    expect(preset("clinical-referral-triage").rollout.phases[1].gateCriteria.join(" ")).toContain("final decision");
    expect(preset("contract-clause-review").rollout.phases[1].gateCriteria.join(" ")).not.toContain("final decision");
  });

  it("low readiness starts with enablement; otherwise the exchange rhythm starts in Days 1–30", () => {
    expect(run(EDGE.lowReadiness).rollout.phases[0].deliverables.some((d) => d.text.startsWith("Enablement first"))).toBe(true);
    expect(run(EDGE.noPersonalData).rollout.phases[0].deliverables.some((d) => d.text.startsWith("Start the joint working rhythm"))).toBe(true);
  });

  it("go-live starts with machine steps, or keeps review on every step when there are none", () => {
    expect(preset("claims-document-intake").rollout.phases[2].deliverables[0]?.text).toContain("steps the AI does alone (Classify documents, Extract receipt fields)");
    const allReview = {
      ...PLAIN_DECOMPOSITION,
      subtasks: [subtask("s1", { consequential: true }), subtask("s2", { errorCost: "high" }), subtask("s3")],
    };
    const none = run(makeCase("no machine steps", {}, allReview)).rollout.phases[2].deliverables[0]?.text;
    expect(none).toBe("Go live in controlled increments, with human review on every step.");
  });

  it("names the first split review date", () => {
    expect(preset("hiring-and-sentiment").rollout.phases[0].deliverables.some((d) => d.text.includes("2027-02-20"))).toBe(true);
  });
});

describe("rollout owners and plain copy (ADR-0018)", () => {
  it("every deliverable has a likely owner role and no subtask IDs", () => {
    for (const c of ALL_CASES) {
      const r = run(c);
      for (const p of r.rollout.phases)
        for (const d of p.deliverables) {
          expect(d.ownerRole.length, c.name).toBeGreaterThan(0);
          const t = r.facts.subtasks.reduce((x, s) => x.split(s.name).join("<name>"), d.text);
          expect(t, c.name).not.toMatch(/\bs\d\b/);
        }
    }
  });
  it("rule deliverables take the rule's owner role", () => {
    const r = run({ name: "claims", ...getPreset("claims-document-intake")! });
    const pia = r.rollout.phases[0].deliverables.find((d) => d.source.kind === "rule" && d.source.ruleId === "BC-FIPPA-01");
    expect(pia?.ownerRole).toBe("Privacy office, with the product owner");
  });
});

describe("future rules in the rollout (ADR-0018, legal review)", () => {
  it("deliverables from IN_FORCE_FUTURE rules start with their start date", () => {
    let seen = 0;
    for (const c of ALL_CASES) {
      const r = run(c);
      const future = new Set(r.triggeredRules.filter((t) => t.effectiveStatus === "IN_FORCE_FUTURE").map((t) => t.ruleId));
      for (const d of r.rollout.phases[0].deliverables)
        if (d.source.kind === "rule" && future.has(d.source.ruleId)) {
          seen++;
          expect(d.text, c.name).toMatch(/^Applies from [A-Z][a-z]+ \d{1,2}, \d{4}: /);
        }
    }
    expect(seen).toBeGreaterThan(0);
  });
});
