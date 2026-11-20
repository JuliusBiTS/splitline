import { describe, expect, it } from "vitest";
import type { RuleDefinition, TriggeredRule } from "./types";
import { bindingnessRank, computeVerdict } from "./verdict";

const rule = (id: string, extra: Partial<RuleDefinition> = {}): RuleDefinition => ({
  id,
  title: id,
  jurisdiction: "bc",
  instrument: "test",
  status: "IN_FORCE",
  reads: ["orgType"],
  appliesWhen: () => true,
  severity: () => "action",
  consideration: "test",
  actionsToConsider: ["test"],
  sources: [{ label: "test", url: "https://example.org" }],
  lastVerified: "2026-11-20",
  ...extra,
});

const t = (ruleId: string, extra: Partial<TriggeredRule> = {}): TriggeredRule => ({
  ruleId,
  effectiveStatus: "IN_FORCE",
  inScope: true,
  severity: "action",
  requestedSeverity: "action",
  matchedFacts: [],
  notes: [],
  actions: [],
  tierFactorMatch: false,
  ...extra,
});

describe("verdict (SPEC §7.3)", () => {
  const cat = [rule("A"), rule("B", { redesignPath: "redesign" }), rule("C")];
  it("Go when only info rules trigger", () => {
    expect(computeVerdict([t("A", { severity: "info" })], cat).verdict).toBe("go");
    expect(computeVerdict([], cat).verdict).toBe("go");
  });
  it("Go with conditions with an action and no blocker", () => {
    expect(computeVerdict([t("A"), t("C", { severity: "info" })], cat).verdict).toBe("go_with_conditions");
  });
  it("Redesign with a blocker that has a redesign path", () => {
    expect(computeVerdict([t("A"), t("B", { severity: "blocker" })], cat).verdict).toBe("redesign");
  });
  it("Stop with a blocker that has no redesign path", () => {
    expect(computeVerdict([t("A", { severity: "blocker" })], cat).verdict).toBe("stop");
  });
  it("uses the capped (effective) severity, not the requested one", () => {
    expect(computeVerdict([t("A", { severity: "info", requestedSeverity: "blocker" })], cat).verdict).toBe("go");
  });
});

describe("top-3 conditions ranking (ADR-0007 §3, ADR-0012 §2)", () => {
  const cat = ["R1", "R2", "R3", "R4", "R5", "R6"].map((id) => rule(id, { redesignPath: "x" }));
  it("bindingness order: IN_FORCE > in-scope policy > future > guidance > draft", () => {
    expect(bindingnessRank({ effectiveStatus: "IN_FORCE", inScope: true }, false)).toBe(0);
    expect(bindingnessRank({ effectiveStatus: "GOVERNMENT_POLICY", inScope: true }, false)).toBe(1);
    expect(bindingnessRank({ effectiveStatus: "IN_FORCE_FUTURE", inScope: true }, false)).toBe(2);
    expect(bindingnessRank({ effectiveStatus: "REGULATOR_GUIDANCE", inScope: true }, false)).toBe(3);
    expect(bindingnessRank({ effectiveStatus: "REGULATOR_GUIDANCE", inScope: true }, true)).toBe(4);
  });
  it("ranks severity, then bindingness, then tier-factor match, then catalogue order; excludes info", () => {
    const triggered = [
      t("R1", { effectiveStatus: "REGULATOR_GUIDANCE" }),
      t("R2", { effectiveStatus: "IN_FORCE" }),
      t("R3", { effectiveStatus: "IN_FORCE", tierFactorMatch: true }),
      t("R4", { effectiveStatus: "REGULATOR_GUIDANCE", severity: "blocker" }),
      t("R5", { severity: "info" }),
      t("R6", { effectiveStatus: "IN_FORCE_FUTURE" }),
    ];
    expect(computeVerdict(triggered, cat).topConditions).toEqual(["R4", "R3", "R2"]);
  });
  it("is deterministic regardless of input order", () => {
    const triggered = [t("R2"), t("R1"), t("R6", { effectiveStatus: "IN_FORCE_FUTURE" })];
    const a = computeVerdict(triggered, cat).topConditions;
    const b = computeVerdict([...triggered].reverse(), cat).topConditions;
    expect(a).toEqual(b);
    expect(a).toEqual(["R1", "R2", "R6"]);
  });
});
