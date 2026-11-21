import { describe, expect, it } from "vitest";
import { computeCase } from "@/engine";
import { scorePulse } from "@/engine/pulse";
import { computeWhatIf } from "@/engine/whatif";
import { getPreset } from "@/content/presets";
import { formatCents, formatIsoDate, formatSigned, MINUS } from "./format";
import { checkTotal, reviewKeyAction } from "./review-panel.logic";
import { barGeometry, pulseScoreRows, quadrantShortName, quadrantSummary, scoreRowsSummary, toPlot } from "./scores.logic";
import { isOwnerEdited, ownerEditedNote, splitSummary } from "./split-map.logic";
import { stepState } from "./steps.logic";
import { tierChipLabel, VERDICT_GLYPHS } from "./verdict.logic";
import { diffChips, parseDiffChip } from "./what-if.logic";

describe("format", () => {
  it("formats ISO dates deterministically", () => {
    expect(formatIsoDate("2026-12-15")).toBe("December 15, 2026");
    expect(formatIsoDate("not a date")).toBe("not a date");
  });
  it("signs scores with a true minus", () => {
    expect(formatSigned(0.42)).toBe("+0.42");
    expect(formatSigned(-0.15)).toBe(`${MINUS}0.15`);
    expect(formatSigned(-0.001)).toBe("0.00");
    expect(formatSigned(0)).toBe("0.00");
  });
  it("formats cents", () => {
    expect(formatCents(27700)).toBe("$277.00");
  });
});

describe("verdict", () => {
  it("tier label always carries the AIA-inspired qualifier", () => {
    expect(tierChipLabel("III")).toBe("AIA-inspired indicative tier III");
    expect(tierChipLabel("III")).not.toMatch(/^AIA\b(?!-)/);
  });
  it("every verdict has a distinct glyph shape (icon, not colour)", () => {
    expect(new Set(Object.values(VERDICT_GLYPHS)).size).toBe(4);
  });
});

describe("split map", () => {
  it("summarizes owners like the intake bottom bar", () => {
    expect(splitSummary(["machine", "machine_review", "machine", "machine_review", "human"])).toBe(
      "5 subtasks · 2 Machine · 2 Machine + review · 1 Human",
    );
  });
  it("derives the edited flag from the AI proposal", () => {
    expect(isOwnerEdited("machine_review", "machine")).toBe(true);
    expect(isOwnerEdited("human", "human")).toBe(false);
    expect(ownerEditedNote("machine")).toBe("Owner edited by you · AI proposed Machine");
  });
});

describe("scores", () => {
  it("bars grow from the centre with width |v| × 50 %", () => {
    expect(barGeometry(0.42)).toEqual({ side: "pos", widthPct: 21 });
    expect(barGeometry(-0.15)).toEqual({ side: "neg", widthPct: 7.5 });
    expect(barGeometry(0)).toEqual({ side: "zero", widthPct: 0 });
    expect(barGeometry(3)).toEqual({ side: "pos", widthPct: 50 });
  });
  it("reinforcement row is min(A→B, B→A) and the weaker direction is flagged", () => {
    const rows = pulseScoreRows({ a: 0.42, b: 0.18, reinforcement: 0.18, weakerDirection: "b_to_a" });
    expect(rows.map((r) => [r.key, r.isMinimum, r.display])).toEqual([
      ["a_to_b", false, "+0.42"],
      ["b_to_a", true, "+0.18"],
      ["reinforcement", false, "+0.18"],
    ]);
    expect(scoreRowsSummary(rows)).toBe("A→B +0.42; B→A +0.18 (minimum); Reinforcement +0.18");
  });
  it("matches the engine's Pulse scoring", () => {
    const p = scorePulse({ role: "lead", A1: 6, A2: 6, A3: 5, B1: 4, B2: 5, B3: 4, D1: 4, D2: 4, D3: 4 });
    const rows = pulseScoreRows(p);
    expect(rows[2]!.value).toBe(Math.min(p.a, p.b));
  });
  it("maps scores into the plot with +1 at the top right", () => {
    expect(toPlot(1, 1, 200, 20)).toEqual({ x: 180, y: 20 });
    expect(toPlot(-1, -1, 200, 20)).toEqual({ x: 20, y: 180 });
    expect(toPlot(0, 0, 200, 20)).toEqual({ x: 100, y: 100 });
  });
  it("names quadrants with the engine labels", () => {
    expect(quadrantShortName(0.3, 0.2)).toBe("Virtuous");
    expect(quadrantShortName(0.3, -0.2)).toBe("One-sided");
    expect(quadrantSummary([{ label: "Ep 1", a: 0.1, b: -0.1 }])).toContain("reinforcement −0.10");
  });
});

describe("steps", () => {
  it("derives done / current / pending", () => {
    expect([0, 1, 2, 3].map((i) => stepState(i, 2))).toEqual(["done", "done", "current", "pending"]);
    expect(stepState(3, 4)).toBe("done");
  });
});

describe("review panel", () => {
  it("maps shortcut keys", () => {
    expect(reviewKeyAction({ key: "c" })).toEqual({ type: "correct" });
    expect(reviewKeyAction({ key: "A" })).toEqual({ type: "accept" });
    expect(reviewKeyAction({ key: "3" })).toEqual({ type: "reason", code: 3 });
    expect(reviewKeyAction({ key: "6" })).toBeNull();
    expect(reviewKeyAction({ key: "j" })).toEqual({ type: "next" });
  });
  it("ignores keys while typing or with modifiers", () => {
    expect(reviewKeyAction({ key: "c", targetTag: "input" })).toBeNull();
    expect(reviewKeyAction({ key: "c", targetIsContentEditable: true })).toBeNull();
    expect(reviewKeyAction({ key: "c", ctrlKey: true })).toBeNull();
  });
  it("checks the receipt total against the lines", () => {
    const r = checkTotal([9500, 8500, 8500, 1200], 28900);
    expect(r.mismatch).toBe(true);
    expect(r.message).toBe("Lines sum to $277.00 (difference $12.00)");
    expect(checkTotal([100, 200], 300).mismatch).toBe(false);
  });
});

describe("what-if chips", () => {
  it("parses engine chips into from → to", () => {
    expect(parseDiffChip("Tier III → II")).toMatchObject({ kind: "change", prefix: "AIA-inspired indicative tier", from: "III", to: "II" });
    expect(parseDiffChip("Verdict: Redesign → Go with conditions")).toMatchObject({
      prefix: "Verdict",
      from: "Redesign",
      to: "Go with conditions",
    });
    expect(parseDiffChip("+2 rules")).toEqual({ kind: "note", text: "+2 rules" });
  });
  it("drops unchanged notes and works on a real engine diff", () => {
    const preset = getPreset("claims-document-intake")!;
    const opts = { today: "2026-11-20" };
    const base = computeCase(preset.intake, preset.decomposition, opts);
    const { diff } = computeWhatIf(base, preset.intake, preset.decomposition, { hosting: "us_or_global_api" }, opts);
    const chips = diffChips(diff);
    expect(chips.every((c) => !/unchanged/.test(c.text))).toBe(true);
    expect(diffChips({ chips: ["Tier unchanged", "Verdict unchanged"] })).toEqual([]);
  });
});
