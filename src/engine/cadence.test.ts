import { describe, expect, it } from "vitest";
import { addMonths, cadenceFor, CADENCE_MONTHS, nextReviewDate } from "./cadence";

describe("split review cadence by dynamism (`02_*` §3.4)", () => {
  it("high → monthly, medium → every 2 months, low → quarterly", () => {
    expect([cadenceFor("high"), cadenceFor("medium"), cadenceFor("low")]).toEqual(["monthly", "bimonthly", "quarterly"]);
    expect(CADENCE_MONTHS).toEqual({ monthly: 1, bimonthly: 2, quarterly: 3 });
  });

  it("next review date counts from the injected today", () => {
    expect(nextReviewDate("2026-11-20", "monthly")).toBe("2026-12-20");
    expect(nextReviewDate("2026-11-20", "bimonthly")).toBe("2027-01-20");
    expect(nextReviewDate("2026-11-20", "quarterly")).toBe("2027-02-20");
  });
});

describe("addMonths", () => {
  it("clamps to the end of shorter months, including leap years", () => {
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-08-31", 1)).toBe("2026-09-30");
  });

  it("crosses year boundaries", () => {
    expect(addMonths("2026-12-15", 3)).toBe("2027-03-15");
  });

  it("rejects malformed or impossible dates", () => {
    expect(() => addMonths("2026-13-01", 1)).toThrow();
    expect(() => addMonths("2026-02-30", 1)).toThrow();
    expect(() => addMonths("20 Nov 2026", 1)).toThrow();
  });
});
