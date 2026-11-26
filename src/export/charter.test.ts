import { describe, expect, it } from "vitest";
import { computePreset, PRESET_AS_OF, verdictReason } from "@/components/workspace/model";
import { PRESETS } from "@/content/presets";
import { getRecordedNarrative } from "@/content/presets/narratives";
import { DISCLAIMER_LONG } from "@/engine";
import { DIRECT_COST_PLAIN } from "@/engine/levers";
import { charterFileName, charterMarkdown, charterModel, shortDeliverable } from "./charter";

const inputFor = (p: (typeof PRESETS)[number]) => {
  const result = computePreset(p);
  return {
    title: p.intake.title,
    asOf: PRESET_AS_OF,
    result,
    decomposition: p.decomposition,
    reason: p.verdictExplanation,
    narrative: getRecordedNarrative(p.slug),
    url: `https://example.test/preset/${p.slug}`,
  };
};

describe("charter (SPEC §11, ADR-0018)", () => {
  for (const p of PRESETS) {
    it(`has every section, guardrails, direct costs and the disclaimer: ${p.slug}`, () => {
      const md = charterMarkdown(inputFor(p));
      for (const h of ["## Before you pilot", "## Who does what", "## How the team runs it", "## 90-day plan", "## KPIs", "## Triggered rules"]) {
        expect(md).toContain(h);
      }
      expect(md).toContain("AIA-inspired indicative tier");
      expect(md).toContain(DISCLAIMER_LONG);
      expect(md).toContain(`https://example.test/preset/${p.slug}`);
      for (const cost of Object.values(DIRECT_COST_PLAIN)) expect(md).toContain(cost);
      expect(md.match(/- Keep in place:/g)?.length).toBe(3);
      expect(md).toMatch(/Last verified/);
      // The long disclaimer is the final line; the thesis scope note travels with the levers.
      expect(md.trim().split("\n").at(-1)).toBe(`**${DISCLAIMER_LONG}**`);
      expect(md).toContain("Its propositions are untested.");
    });

    it(`shows no IDs, thesis jargon or banned legal wording: ${p.slug}`, () => {
      const md = charterMarkdown(inputFor(p));
      expect(md).not.toMatch(/\bs\d\b|\(P[1-4]\)|Table 4|Section 6\.4/);
      expect(md).not.toMatch(/\b[A-Z]{2,}(-[A-Z0-9]+)+\b(?!\))/); // rule IDs like BC-FIPPA-01 (source link labels are titles)
      expect(md).not.toMatch(/\bcompliant\b|you must|must comply/i);
    });
  }

  it("lists every triggered rule with status and a source link", () => {
    const p = PRESETS[0]!;
    const m = charterModel(inputFor(p));
    expect(m.rules.length).toBe(computePreset(p).triggeredRules.length);
    expect(m.rules.every((r) => r.status && r.sources.length > 0)).toBe(true);
  });

  it("labels the AI narrative and works without one", () => {
    const p = PRESETS[0]!;
    expect(charterMarkdown(inputFor(p))).toContain("The rules engine, not the AI, set the tier");
    expect(charterMarkdown({ ...inputFor(p), narrative: null })).not.toContain("## In brief");
  });

  it("makes safe file names", () => {
    expect(charterFileName("Équipement: lease/review!", "md")).toBe("splitline-charter-equipement-leasereview.md");
    expect(charterFileName("", "json", "splitline-inventory")).toBe("splitline-inventory-case.json");
  });
});

describe("verdictReason", () => {
  it("explains each preset verdict from engine output with likely-wording", () => {
    for (const p of PRESETS) {
      const text = verdictReason(computePreset(p));
      expect(text).toMatch(/likely|to consider/);
      expect(text).not.toMatch(/conditions? likely appl/);
      expect(text).toContain("AIA-inspired indicative tier");
      expect(text).not.toMatch(/\bcompliant\b|you must/i);
    }
    const hiring = verdictReason(computePreset(PRESETS.find((p) => p.slug === "hiring-and-sentiment")!));
    expect(hiring).toMatch(/likely block/);
  });
});

describe("shortDeliverable (printed plan headlines)", () => {
  it("names rule deliverables by rule title, keeping status prefixes", () => {
    expect(shortDeliverable({ text: "BC PIPA: x: Document the purpose.", source: { kind: "rule", ruleId: "BC-PIPA-01" } })).not.toContain("Document");
    expect(shortDeliverable({ text: "Prepare for (proposed): Bill C-36.", source: { kind: "rule", ruleId: "FED-C36-XB" } })).toMatch(/^Prepare for \(proposed\): Bill C-36/);
    expect(shortDeliverable({ text: "Set up the shared platform: Common tooling across teams.", source: { kind: "lever", lever: "decision_rights" } })).toBe(
      "Set up the shared platform",
    );
    expect(shortDeliverable({ text: "Run the AI system in shadow mode. Then compare.", source: { kind: "model" } })).toBe("Run the AI system in shadow mode");
  });
});
