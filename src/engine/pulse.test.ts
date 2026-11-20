import { describe, expect, it } from "vitest";
import { TABLE_4, THESIS_SCOPE_DISCLOSURE } from "./levers";
import { directionScore, PULSE_FOOTNOTE, quadrantOf, scorePulse } from "./pulse";
import { PulseResultSchema, type PulseInput } from "./types";

const input = (a: number, b: number, d: [number, number, number] = [4, 4, 4]): PulseInput => ({
  role: "augmentation_work",
  A1: a,
  A2: a,
  A3: a,
  B1: b,
  B2: b,
  B3: b,
  D1: d[0],
  D2: d[1],
  D3: d[2],
});

describe("direction score (`02_*` §3.7)", () => {
  it("(mean − 4) / 3 maps 1..7 to −1..+1", () => {
    expect(directionScore([1, 1, 1])).toBe(-1);
    expect(directionScore([4, 4, 4])).toBe(0);
    expect(directionScore([7, 7, 7])).toBe(1);
    expect(directionScore([5, 6, 7])).toBeCloseTo(2 / 3, 10);
  });
});

describe("reinforcement = min(A→B, B→A)", () => {
  it("is the minimum, not the mean: a strong direction cannot offset a weak one", () => {
    const r = scorePulse(input(7, 2));
    expect(r.a).toBe(1);
    expect(r.b).toBeCloseTo(-2 / 3, 10);
    expect(r.reinforcement).toBe(r.b);
    expect(r.reinforcement).toBeLessThan((r.a + r.b) / 2);
    expect(r.weakerDirection).toBe("b_to_a");
    expect(scorePulse(input(2, 7)).weakerDirection).toBe("a_to_b");
    expect(scorePulse(input(5, 5)).weakerDirection).toBe("both");
  });

  it("a mixed item set that averages to 4 scores exactly 0", () => {
    const r = scorePulse({ ...input(4, 4), A1: 3, A2: 4, A3: 5 });
    expect(r.a).toBe(0);
  });
});

describe("quadrants (`02_*` §3.7, Figure 2; ADR-0016 §7)", () => {
  it.each([
    [1, 1, "virtuous"],
    [1, -1, "one_sided"],
    [-1, 1, "one_sided"],
    [-1, -1, "vicious"],
    [0, 1, "one_way_limit"],
    [1, 0, "one_way_limit"],
    [0, -1, "vicious"],
    [0, 0, "vicious"],
  ] as const)("A=%d, B=%d → %s", (a, b, q) => {
    expect(quadrantOf(a, b)).toBe(q);
  });

  it("one-way limit case has reinforcement 0; one-sided is negative despite the strong side", () => {
    expect(scorePulse(input(7, 4)).reinforcement).toBe(0);
    expect(scorePulse(input(7, 4)).quadrant).toBe("one_way_limit");
    expect(scorePulse(input(7, 3)).reinforcement).toBeLessThan(0);
    expect(scorePulse(input(7, 3)).quadrant).toBe("one_sided");
  });
});

describe("lagging driver → lever + guardrail (Table 4)", () => {
  it("the lowest D item names the lever and its guardrail", () => {
    expect(scorePulse(input(3, 3, [5, 2, 6])).laggingDrivers).toEqual([
      {
        item: "D2",
        score: 2,
        lever: "coordination",
        leverName: "Coordination (P2)",
        guardrail: TABLE_4.coordination.guardrail,
        directCost: TABLE_4.coordination.directCost,
      },
    ]);
    expect(scorePulse(input(3, 3, [1, 2, 6])).laggingDrivers[0]?.lever).toBe("decision_rights");
    expect(scorePulse(input(3, 3, [6, 2, 1])).laggingDrivers[0]?.lever).toBe("exchange");
  });

  it("ties return every tied driver in D1, D2, D3 order", () => {
    expect(scorePulse(input(3, 3, [2, 5, 2])).laggingDrivers.map((d) => d.item)).toEqual(["D1", "D3"]);
  });

  it("the driver check is flagged relevant only when the scores show a problem", () => {
    expect(scorePulse(input(6, 6)).driverCheckRelevant).toBe(false);
    expect(scorePulse(input(6, 4)).driverCheckRelevant).toBe(true);
    expect(scorePulse(input(6, 2)).driverCheckRelevant).toBe(true);
  });
});

describe("labels (SPEC §7.7, ADR-0009)", () => {
  it("carries the short label, the verbatim footnote, single-perspective label, role note and scope disclosure", () => {
    const r = scorePulse({ ...input(5, 5), role: "ai_team" });
    expect(r.labels.short).toBe("illustrative, not validated");
    expect(r.labels.footnote).toBe("Illustrative instrument from a conceptual thesis; not psychometrically validated.");
    expect(PULSE_FOOTNOTE).toBe(r.labels.footnote);
    expect(r.labels.perspective).toBe("single-perspective estimate");
    expect(r.labels.roleNote).toContain("Table 5 intends A items for augmentation staff");
    expect(r.labels.scopeDisclosure).toBe(THESIS_SCOPE_DISCLOSURE);
    expect(r.role).toBe("ai_team");
    expect(() => PulseResultSchema.parse(r)).not.toThrow();
  });

  it("never frames the result as technical readiness vs absorptive capacity", () => {
    expect(JSON.stringify(scorePulse(input(2, 6)))).not.toMatch(/technical readiness|absorptive capacity/i);
  });

  it("the role is context only: it does not change any score", () => {
    const roles = ["augmentation_work", "ai_team", "lead"] as const;
    const scores = roles.map((role) => {
      const r = scorePulse({ ...input(5, 3, [2, 4, 6]), role });
      return [r.a, r.b, r.reinforcement, r.quadrant, r.laggingDrivers];
    });
    expect(scores[1]).toEqual(scores[0]);
    expect(scores[2]).toEqual(scores[0]);
  });

  it("rejects out-of-range or non-integer items", () => {
    expect(() => scorePulse({ ...input(4, 4), A1: 0 })).toThrow();
    expect(() => scorePulse({ ...input(4, 4), B2: 8 })).toThrow();
    expect(() => scorePulse({ ...input(4, 4), D3: 3.5 })).toThrow();
  });
});
