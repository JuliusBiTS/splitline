import { describe, expect, it } from "vitest";
import { RULE_CATALOGUE } from "@/content/rules";
import { computeCase } from "@/engine/index";
import type { Narrative } from "@/engine/types";
import { ALL_CASES, TEST_TODAY } from "../../tests/fixtures/cases";
import { checkNarrative } from "./guard";
import { buildNarrationFacts, userNamesOf } from "./narration-facts";
import { templateNarrative } from "./narrate-template";
import { buildStatuteNames, STATUTE_LEXICON } from "./statute-lexicon";

const n = (executiveSummary: string): Narrative => ({
  executiveSummary,
  splitNarrative: "A person checks the AI output.",
  leverNarratives: ["One.", "Two.", "Three."],
  rolloutNarrative: "Three phases.",
});

describe("statute lexicon", () => {
  it("has an entry with at least one name for every catalogue rule, and no extra entries", () => {
    const ids = RULE_CATALOGUE.map((r) => r.id).sort();
    expect(Object.keys(STATUTE_LEXICON).sort()).toEqual(ids);
    for (const [id, e] of Object.entries(STATUTE_LEXICON)) if (id !== "REF-AIA-TIER") expect(e.names.length).toBeGreaterThan(0);
  });

  it("maps shared names to every rule that uses them", () => {
    const pipa = buildStatuteNames().find((x) => x.name === "PIPA")!;
    expect([...pipa.ruleIds].sort()).toEqual(["BC-PIPA-01", "BC-PIPA-EMP", "BC-PIPA-MON"]);
  });
});

describe("checkNarrative", () => {
  it("passes text that names only triggered statutes", () => {
    expect(checkNarrative(n("This likely triggers a BC FIPPA privacy impact assessment."), ["BC-FIPPA-01"])).toEqual([]);
  });

  it("flags an untriggered statute, by any of its names", () => {
    expect(checkNarrative(n("Consider PIPEDA as well."), ["BC-FIPPA-01"])).toEqual([
      { kind: "untriggered_statute", field: "executiveSummary", match: "PIPEDA" },
    ]);
    expect(checkNarrative(n("Under the freedom of information and protection of privacy act ..."), ["FED-PIPEDA-XB"])[0]?.kind).toBe(
      "untriggered_statute",
    );
  });

  it("does not confuse PIPA with PIPEDA, or the tier label with an official AIA", () => {
    expect(checkNarrative(n("PIPEDA applies."), ["FED-PIPEDA-XB"])).toEqual([]);
    expect(checkNarrative(n("AIA-inspired indicative tier II."), [])).toEqual([]);
    expect(checkNarrative(n("An official AIA is needed."), [])[0]).toMatchObject({ kind: "untriggered_statute", match: "AIA" });
  });

  it("flags rule IDs (triggered or not, including made-up ones) and subtask IDs", () => {
    const kinds = checkNarrative(n("See BC-FIPPA-01, BC-PIPA-07 and step s3."), ["BC-FIPPA-01"]).map((v) => v.kind);
    expect(kinds).toEqual(expect.arrayContaining(["rule_id", "untriggered_rule_id", "subtask_id"]));
  });

  it("flags legal-conclusion wording", () => {
    const matches = checkNarrative(n("You must do this to stay compliant; this is not legal advice."), []).map((v) => v.match.toLowerCase());
    expect(matches).toEqual(expect.arrayContaining(["you must", "compliant", "legal advice"]));
  });

  it("flags laws that never apply, the AIA tier misuse, 'required by law' and thesis jargon", () => {
    const kinds = checkNarrative(n("AIDA and the GDPR apply; your AIA tier is II; this is required by law under P1 and Table 4."), ["FED-DADM-01"]).map((v) => v.kind);
    expect(kinds.filter((k) => k === "never_allowed_statute")).toHaveLength(2);
    expect(kinds.filter((k) => k === "banned_phrase")).toHaveLength(2);
    expect(kinds.filter((k) => k === "thesis_jargon")).toHaveLength(2);
  });

  it("does not let the always-triggered tier reference allow DADM names", () => {
    expect(checkNarrative(n("DADM requires a human final decision."), ["REF-AIA-TIER"])[0]?.kind).toBe("untriggered_statute");
    expect(checkNarrative(n("PPCDA requires an assessment."), ["FED-C36-XB"])[0]?.kind).toBe("proposed_as_binding");
  });

  it("requires 'proposed' in any sentence naming a proposed bill", () => {
    expect(checkNarrative(n("Bill C-36 requires an assessment."), ["FED-C36-XB"])[0]?.kind).toBe("proposed_as_binding");
    expect(checkNarrative(n("Prepare for proposed Bill C-36."), ["FED-C36-XB"])).toEqual([]);
  });
});

describe("template narrative", () => {
  it.each(ALL_CASES.map((c) => [c.name, c] as const))("passes the guard and the schema limits: %s", (_name, c) => {
    const r = computeCase(c.intake, c.decomposition, { today: TEST_TODAY });
    const facts = buildNarrationFacts(r, c.decomposition, "Test case");
    const t = templateNarrative(facts);
    expect(checkNarrative(t, r.triggeredRules.map((x) => x.ruleId), { userNames: userNamesOf(facts), levers: facts.levers })).toEqual([]);
    expect(t.executiveSummary.length).toBeLessThanOrEqual(700);
    expect(t.splitNarrative.length).toBeLessThanOrEqual(700);
    expect(t.rolloutNarrative.length).toBeLessThanOrEqual(700);
    t.leverNarratives.forEach((l, i) => {
      expect(l.length).toBeLessThanOrEqual(500);
      expect(l).toContain(`Keep in place: ${facts.levers[i]!.guardrail}`);
      expect(l).toContain(`Direct cost: ${facts.levers[i]!.directCost}`);
    });
    expect(t.executiveSummary).toContain("AIA-inspired indicative tier");
  });
});
