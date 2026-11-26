import { describe, expect, it } from "vitest";
import { scorePulse } from "@/engine/pulse";
import { missingItems, PULSE_GROUPS, PULSE_ITEM_IDS, restoreAnswers, toPulseInput } from "./pulse-logic";

const full = { role: "lead" as const, A1: 6, A2: 6, A3: 6, B1: 2, B2: 2, B3: 2, D1: 5, D2: 2, D3: 4 };

describe("pulse form logic", () => {
  it("covers all nine items once across the three groups", () => {
    expect(PULSE_GROUPS.flatMap((g) => g.items).sort()).toEqual([...PULSE_ITEM_IDS].sort());
  });

  it("needs every item and a role before scoring", () => {
    expect(toPulseInput({ ...full, D3: undefined })).toBeNull();
    expect(missingItems({ A1: 3 })).toHaveLength(8);
    const { role: _r, ...noRole } = full;
    void _r;
    expect(toPulseInput(noRole)).toBeNull();
    expect(toPulseInput(full)).not.toBeNull();
  });

  it("fixed answers give the expected quadrant and lagging lever (e2e fixture)", () => {
    const r = scorePulse(toPulseInput(full)!);
    expect(r.quadrant).toBe("one_sided");
    expect(r.reinforcement).toBeCloseTo(-2 / 3);
    expect(r.laggingDrivers.map((d) => d.lever)).toEqual(["coordination"]);
    expect(r.driverCheckRelevant).toBe(true);
  });

  it("restores only valid stored answers", () => {
    expect(restoreAnswers({ A1: 7, A2: 0, A3: 3.5, B1: "4", role: "boss" })).toEqual({ A1: 7 });
    expect(restoreAnswers(null)).toEqual({});
  });
});
