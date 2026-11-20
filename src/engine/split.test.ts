import { describe, expect, it } from "vitest";
import { subtask } from "../../tests/fixtures/cases";
import {
  computeStartingSplit,
  enforceSplitFloor,
  isCaseCodifiable,
  isSafetyCritical,
  matchBranches,
  moreHuman,
  NO_BRANCH_REASON,
  ownerRank,
  scopeSwitchApplies,
  startingOwner,
} from "./split";
import type { SplitOwner, Subtask, TierLevel } from "./types";

const owner = (s: Subtask, tier: TierLevel = "II") => startingOwner(s, tier).owner;

describe("02_* §3.2 starting split heuristic", () => {
  it("machine: high volume, codifiable, error ≤ medium, not consequential", () => {
    expect(owner(subtask("s1", { volume: "high", errorCost: "low" }))).toBe("machine");
    expect(owner(subtask("s1", { volume: "high", errorCost: "medium" }))).toBe("machine");
  });

  it("machine needs every condition", () => {
    expect(owner(subtask("s1", { volume: "high", knowledgeType: "tacit" }))).toBe("machine_review");
    expect(owner(subtask("s1", { volume: "medium" }))).toBe("machine_review");
    expect(owner(subtask("s1", { volume: "high", errorCost: "high" }))).toBe("machine_review");
    expect(owner(subtask("s1", { volume: "high", consequential: true }))).toBe("machine_review");
  });

  it("machine + review: consequential, or error cost high", () => {
    expect(owner(subtask("s1", { consequential: true }))).toBe("machine_review");
    expect(owner(subtask("s1", { errorCost: "high" }))).toBe("machine_review");
  });

  it("critical error cost counts as ≥ high (ADR-0016 §3): codifiable critical → machine + review", () => {
    const r = startingOwner(subtask("s1", { errorCost: "critical", volume: "high" }), "I");
    expect(r.owner).toBe("machine_review");
    expect(r.reason).toContain("critical");
  });

  it("human: critical error cost with tacit knowledge, at any tier", () => {
    for (const tier of ["I", "II", "III", "IV"] as const)
      expect(owner(subtask("s1", { errorCost: "critical", knowledgeType: "tacit" }), tier)).toBe("human");
  });

  it("human: at tier IV the step that is the decision (consequential + high judgment; ADR-0016 §1)", () => {
    const decision = subtask("s1", { consequential: true, judgmentIntensity: "high" });
    expect(owner(decision, "IV")).toBe("human");
    expect(owner(decision, "III")).toBe("machine_review");
    // Bears on the decision but is not the decision → machine + review even at tier IV.
    expect(owner(subtask("s1", { consequential: true, judgmentIntensity: "medium" }), "IV")).toBe("machine_review");
  });

  it("tier ≥ III override names the tier for steps that bear on the decision", () => {
    const m = matchBranches(subtask("s1", { consequential: true, judgmentIntensity: "low" }), "III");
    expect(m.some((x) => x.reason.includes("tier III"))).toBe(true);
    expect(matchBranches(subtask("s1", { consequential: true }), "II").some((x) => x.reason.includes("tier"))).toBe(false);
  });

  it("when several branches match, the most human owner wins", () => {
    // consequential (review) + critical tacit (human)
    const s = subtask("s1", { consequential: true, errorCost: "critical", knowledgeType: "tacit" });
    expect(matchBranches(s, "II").map((x) => x.owner)).toEqual(["machine_review", "machine_review", "human"]);
    expect(owner(s)).toBe("human");
  });

  it("no branch matches → machine + review with an explanatory reason (ADR-0016 §2)", () => {
    const r = startingOwner(subtask("s1", { volume: "medium", errorCost: "medium" }), "II");
    expect(r).toEqual({ subtaskId: "s1", owner: "machine_review", reason: NO_BRANCH_REASON });
  });

  it("the tier override only moves toward more human control", () => {
    const steps = [
      subtask("s1", { volume: "high" }),
      subtask("s2", { consequential: true }),
      subtask("s3", { consequential: true, judgmentIntensity: "high" }),
      subtask("s4", { errorCost: "critical", knowledgeType: "tacit" }),
      subtask("s5", { volume: "low" }),
    ];
    const tiers: TierLevel[] = ["I", "II", "III", "IV"];
    for (let i = 1; i < tiers.length; i++) {
      const lower = computeStartingSplit({ subtasks: steps, indicativeTier: tiers[i - 1] ?? "I" });
      const higher = computeStartingSplit({ subtasks: steps, indicativeTier: tiers[i] ?? "I" });
      lower.forEach((x, j) => expect(ownerRank(higher[j]?.owner ?? "machine")).toBeGreaterThanOrEqual(ownerRank(x.owner)));
    }
  });

  it("at tier ≥ III no step that bears on the decision starts at machine", () => {
    const s = computeStartingSplit({
      subtasks: [subtask("s1", { consequential: true, volume: "high" })],
      indicativeTier: "III",
    });
    expect(s[0]?.owner).not.toBe("machine");
  });
});

describe("moreHuman / ownerRank", () => {
  it("orders machine < machine_review < human", () => {
    const o: SplitOwner[] = ["machine", "machine_review", "human"];
    expect(o.map(ownerRank)).toEqual([0, 1, 2]);
    expect(moreHuman("machine", "human")).toBe("human");
    expect(moreHuman("human", "machine_review")).toBe("human");
  });
});

describe("split floor for later moves (SPEC §7.4)", () => {
  const subtasks = [subtask("s1", { consequential: true }), subtask("s2")];
  const moved = [
    { subtaskId: "s1", owner: "machine" as const, reason: "team proposal" },
    { subtaskId: "s2", owner: "machine" as const, reason: "team proposal" },
  ];

  it("allows moves toward machine below tier III", () => {
    expect(enforceSplitFloor(moved, { subtasks, indicativeTier: "II" })).toEqual(moved);
  });

  it("keeps consequential steps at ≥ machine + review at tier ≥ III; other steps may move to machine", () => {
    const r = enforceSplitFloor(moved, { subtasks, indicativeTier: "III" });
    expect(r[0]?.owner).toBe("machine_review");
    expect(r[0]?.reason).toContain("tier III");
    expect(r[1]?.owner).toBe("machine");
  });

  it("does not downgrade human", () => {
    const r = enforceSplitFloor([{ subtaskId: "s1", owner: "human", reason: "x" }], { subtasks, indicativeTier: "IV" });
    expect(r[0]?.owner).toBe("human");
  });
});

describe("scope switch (SPEC §7.4, `02_*` §1.10)", () => {
  const codifiableCons = subtask("s1", { consequential: true });
  const tacitCons = subtask("s2", { consequential: true, knowledgeType: "tacit" });
  const tacitPlain = subtask("s3", { knowledgeType: "tacit" });

  it("codifiable at case level = every consequential subtask is codifiable", () => {
    expect(isCaseCodifiable([codifiableCons, tacitPlain])).toBe(true);
    expect(isCaseCodifiable([codifiableCons, tacitCons])).toBe(false);
  });

  it("without a consequential subtask, every subtask must be codifiable (ADR-0016 §4)", () => {
    expect(isCaseCodifiable([subtask("s1"), subtask("s2")])).toBe(true);
    expect(isCaseCodifiable([subtask("s1"), tacitPlain])).toBe(false);
    expect(isCaseCodifiable([])).toBe(false);
  });

  it("safety-critical = any critical error cost, or the clinical_triage pattern", () => {
    expect(isSafetyCritical({ subtasks: [subtask("s1", { errorCost: "critical" })], useCasePatterns: [] })).toBe(true);
    expect(isSafetyCritical({ subtasks: [subtask("s1")], useCasePatterns: ["clinical_triage"] })).toBe(true);
    expect(isSafetyCritical({ subtasks: [subtask("s1")], useCasePatterns: ["hiring_selection"] })).toBe(false);
  });

  it("applies when codifiable AND (safety-critical OR tier ≥ III)", () => {
    const base = { subtasks: [codifiableCons], useCasePatterns: [] };
    expect(scopeSwitchApplies({ ...base, indicativeTier: "II" })).toBe(false);
    expect(scopeSwitchApplies({ ...base, indicativeTier: "III" })).toBe(true);
    expect(scopeSwitchApplies({ ...base, useCasePatterns: ["clinical_triage"], indicativeTier: "I" })).toBe(true);
    expect(scopeSwitchApplies({ subtasks: [tacitCons], useCasePatterns: ["clinical_triage"], indicativeTier: "IV" })).toBe(false);
  });
});
