import { describe, expect, it } from "vitest";
import { catalogueStatus } from "@/components/splitline/status-badge.logic";
import { PRESETS, getPreset } from "@/content/presets";
import { getRule, RULE_CATALOGUE } from "@/content/rules";
import { computeWhatIf } from "@/engine/whatif";
import { computePreset, inventoryRecord, PRESET_AS_OF, rulesBySeverity } from "./model";
import { baseValues, changedToggles, isChanged, whatIfControls, withControl } from "./what-if-controls";

describe("catalogueStatus (Governance Map)", () => {
  it("never labels a PROPOSED rule as binding", () => {
    for (const r of RULE_CATALOGUE.filter((x) => x.status === "PROPOSED")) {
      expect(catalogueStatus(r).badge.label).toBe("Prepare for (proposed)");
    }
  });

  it("scoped government policy reads 'Mandatory for <scope>; reference elsewhere'", () => {
    const dadm = RULE_CATALOGUE.find((r) => r.status === "GOVERNMENT_POLICY" && r.scopeLabel === "federal institutions")!;
    expect(catalogueStatus(dadm).badge.label).toBe("Mandatory for federal institutions; reference elsewhere");
  });

  it("draft guidance shows the consultation date and its scope", () => {
    const s = catalogueStatus(getRule("FED-OPC-VENDOR")!);
    expect(s.badge.label).toBe("Regulator draft (consultation until December 4, 2026)");
    expect(s.scopeNote).toBe("For private-sector organizations; reference framework elsewhere.");
  });

  it("gives every catalogue rule a label", () => {
    for (const r of RULE_CATALOGUE) expect(catalogueStatus(r).badge.label.length).toBeGreaterThan(0);
  });
});

describe("workspace model", () => {
  it("sorts rules blocker → action → info and keeps all of them", () => {
    const r = computePreset(getPreset("hiring-and-sentiment")!);
    const cards = rulesBySeverity(r);
    expect(cards).toHaveLength(r.triggeredRules.length);
    expect(cards[0]!.badge.kind).toBe("blocker");
  });

  it("builds the SPEC §11 inventory record without free text", () => {
    const p = getPreset("claims-document-intake")!;
    const r = computePreset(p);
    const rec = inventoryRecord("preset-x", p.intake, r, PRESET_AS_OF);
    expect(rec.triggeredRuleIds).toEqual(r.triggeredRules.map((t) => t.ruleId));
    expect(rec.indicativeTier).toBe("II");
    expect(JSON.stringify(rec)).not.toContain(p.intake.processDescription.slice(0, 40));
    expect(Object.keys(rec)).toEqual([
      "useCaseId", "title", "owner", "orgType", "aiType", "aiDecisionRole", "dataCategories", "hosting",
      "indicativeTier", "verdict", "triggeredRuleIds", "splitReviewCadence", "nextReviewDate", "createdAt",
      "engineVersion", "ruleCatalogueVersion",
    ]);
  });
});

describe("what-if controls", () => {
  const p = getPreset("clinical-referral-triage")!;
  const r = computePreset(p);
  const base = baseValues(p.intake, r.facts.dynamism);

  it("starts unchanged and sends only the changed toggles", () => {
    expect(isChanged(base, base)).toBe(false);
    const v = withControl(base, "hosting", "in_canada");
    expect(changedToggles(base, v)).toEqual({ hosting: "in_canada" });
  });

  it("ignores unknown ids and values", () => {
    expect(withControl(base, "hosting", "mars")).toBe(base);
    expect(withControl(base, "nope", true)).toBe(base);
  });

  it("offers the SPEC §7.6 controls", () => {
    expect(whatIfControls(base).map((c) => c.id)).toEqual([
      "hosting", "aiDecisionRole", "quebecAffected", "ontarioAffected", "crisisContext", "dynamism", "customerFacingOutput",
    ]);
  });

  it("hosting → in_canada changes the rules count for every preset hosted outside Canada (ADR-0017)", () => {
    for (const preset of PRESETS) {
      const res = computePreset(preset);
      const b = baseValues(preset.intake, res.facts.dynamism);
      const toggles = changedToggles(b, withControl(b, "hosting", preset.intake.hosting === "in_canada" ? "us_or_global_api" : "in_canada"));
      const w = computeWhatIf(res, preset.intake, preset.decomposition, toggles, { today: PRESET_AS_OF });
      if (preset.intake.hosting === "in_canada") {
        expect(w.result.triggeredRules.length).toBe(res.triggeredRules.length);
      } else {
        expect(w.result.triggeredRules.length).toBeLessThan(res.triggeredRules.length);
      }
    }
  });
});

describe("self-assessment", () => {
  it("matches the copy on /self-assessment: no blocker, the vendor draft is the condition", async () => {
    const { SELF_ASSESSMENT } = await import("@/content/self-assessment");
    const r = computePreset(SELF_ASSESSMENT);
    expect(r.verdict.verdict).toBe("go_with_conditions");
    expect(r.triggeredRules.some((t) => t.severity === "blocker")).toBe(false);
    expect(r.verdict.topConditions).toEqual(["FED-OPC-VENDOR"]);
    expect(SELF_ASSESSMENT.intake.hosting).toBe("us_or_global_api");
    expect(SELF_ASSESSMENT.intake.dataCategories).toEqual(["no_personal"]);
  });
});

describe("preset slugs for the proxy", () => {
  it("match the committed presets", async () => {
    const { PRESET_SLUGS } = await import("@/content/presets/slugs");
    expect([...PRESET_SLUGS].sort()).toEqual(PRESETS.map((p) => p.slug).sort());
  });
});
