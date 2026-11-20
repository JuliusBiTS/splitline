import { describe, expect, it } from "vitest";
import { computeCase } from "@/engine";
import { PresetSchema } from "@/engine/types";
import { PRESETS } from "./index";

const REAL_NAMES = [/\bICBC\b/i, /Insurance Corporation of British Columbia/i, /Fraser Health/i, /Island Health/i, /Interior Health/i, /Vancouver Coastal/i, /Northern Health/i, /\bPHSA\b/i];

describe("presets", () => {
  it("has the four SPEC §10 slugs", () => {
    expect(PRESETS.map((p) => p.slug)).toEqual([
      "clinical-referral-triage",
      "contract-clause-review",
      "hiring-and-sentiment",
      "claims-document-intake",
    ]);
  });

  describe.each(PRESETS.map((p) => [p.slug, p] as const))("%s", (_slug, p) => {
    it("validates against PresetSchema", () => {
      expect(PresetSchema.safeParse(p).success).toBe(true);
    });
    it("names a fictional organization and no real insurer or health authority", () => {
      expect(p.organization).toContain("(fictional)");
      const text = JSON.stringify(p);
      for (const re of REAL_NAMES) expect(text).not.toMatch(re);
    });
    it("explains the verdict in at most 3 sentences, without legal-advice wording", () => {
      const sentences = p.verdictExplanation.split(/(?<=[.!?])\s+/).filter(Boolean);
      expect(sentences.length).toBeLessThanOrEqual(3);
      expect(p.verdictExplanation).not.toMatch(/compliant|must comply|legal advice|you must|mandatory action|required by law/i);
    });
    it("runs through the engine", () => {
      expect(() => computeCase(p.intake, p.decomposition, { today: "2026-11-20" })).not.toThrow();
    });
  });
});
