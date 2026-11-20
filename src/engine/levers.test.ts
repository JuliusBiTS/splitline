import { describe, expect, it } from "vitest";
import { CONSEQUENTIAL_DECOMPOSITION, EDGE, makeCase, run, subtask, PLAIN_DECOMPOSITION } from "../../tests/fixtures/cases";
import {
  CENTRAL_GUARDRAILS_SETTING,
  CRISIS_SCOPE_NOTE,
  CRISIS_SETTING,
  DEFAULT_DECISION_RIGHTS_SETTING,
  GRADUAL_RAMP_SETTING,
  HFD_FEDERAL,
  HFD_NON_FEDERAL,
  LEVER_NAMES,
  LOW_READINESS_SCOPE_NOTE,
  TABLE_4,
  THESIS_SCOPE_DISCLOSURE,
  TRADE_OFF_NOTE,
} from "./levers";
import type { ConfirmedDecomposition } from "./types";

const BANNED = [/\bcompliant\b/i, /must comply/i, /legal advice/i, /\byou must\b/i, /technical readiness/i];

const levers = (c: Parameters<typeof run>[0]) => run(c).operatingModel.levers;

describe("lever cards carry Table 4 content (`02_*` §1.4, §1.7)", () => {
  it("three cards in fixed order, each with guardrail, direct cost, monitoring and warning indicator", () => {
    const l = levers(EDGE.noPersonalData);
    expect(l.map((x) => x.lever)).toEqual(["decision_rights", "coordination", "exchange"]);
    for (const card of l) {
      const t = TABLE_4[card.lever];
      expect(card.guardrail).toBe(t.guardrail);
      expect(card.directCost).toBe(t.directCost);
      expect(card.monitoringIndicator).toBe(t.monitoringIndicator);
      expect(card.warningIndicator).toBe(t.warningIndicator);
      for (const field of [card.setting, card.guardrail, card.directCost, card.monitoringIndicator, card.warningIndicator])
        expect(field.length).toBeGreaterThan(0);
    }
  });

  it("guardrails keep the counter-pole named in `02_*` §1.4", () => {
    expect(TABLE_4.decision_rights.guardrail).toMatch(/^Shared platform/);
    expect(TABLE_4.coordination.guardrail).toMatch(/^Standardized base/);
    expect(TABLE_4.exchange.guardrail).toMatch(/^Retained differentiation/);
    expect(LEVER_NAMES).toEqual({
      decision_rights: "Decision rights (P1)",
      coordination: "Coordination (P2)",
      exchange: "Grouping and exchange (P3)",
    });
  });

  it("copy never uses banned legal wording or the briefing's 'technical readiness' framing", () => {
    const texts = [THESIS_SCOPE_DISCLOSURE, TRADE_OFF_NOTE, HFD_FEDERAL, HFD_NON_FEDERAL];
    for (const c of Object.values(EDGE)) {
      const r = run(c);
      for (const l of r.operatingModel.levers) texts.push(l.setting, ...l.details);
      texts.push(...r.operatingModel.scopeNotes);
    }
    for (const t of texts) for (const re of BANNED) expect(t).not.toMatch(re);
  });
});

describe("decision rights (`02_*` §3.3)", () => {
  it("default: the team sets the split within a shared platform, with logged overrides", () => {
    const [dr] = levers(EDGE.noPersonalData);
    expect(dr.setting).toBe(DEFAULT_DECISION_RIGHTS_SETTING);
    expect(dr.details.join(" ")).toContain("split register visible to other teams");
    expect(dr.details.join(" ")).toContain("every override is logged");
    expect(dr.details.join(" ")).toContain("automation bias");
  });

  it("scope switch → central guardrails, local proposals", () => {
    const critical: ConfirmedDecomposition = {
      ...PLAIN_DECOMPOSITION,
      subtasks: [subtask("s1", { errorCost: "critical" }), subtask("s2"), subtask("s3")],
    };
    const r = run(makeCase("codifiable, safety-critical", {}, critical));
    expect(r.operatingModel.levers[0].setting).toBe(CENTRAL_GUARDRAILS_SETTING);
    expect(r.operatingModel.scopeNotes[0]).toContain("safety-critical");
    expect(r.operatingModel.scopeNotes[0]).toContain("accountable owner ratifies");
  });

  it("scope switch by tier ≥ III names the tier", () => {
    const r = run(EDGE.federalHighTier);
    expect(r.tier.level === "III" || r.tier.level === "IV").toBe(true);
    expect(r.operatingModel.levers[0].setting).toBe(CENTRAL_GUARDRAILS_SETTING);
    expect(r.operatingModel.scopeNotes.some((n) => n.includes(`at indicative tier ${r.tier.level}`))).toBe(true);
  });

  it("crisis → temporary centralization that reverses P1; central guardrails return afterwards", () => {
    const crisisCentral = makeCase(
      "crisis + scope switch",
      { ...EDGE.federalHighTier.intake, crisisContext: true },
      CONSEQUENTIAL_DECOMPOSITION,
    );
    const r = run(crisisCentral);
    expect(r.operatingModel.levers[0].setting).toBe(CRISIS_SETTING);
    expect(r.operatingModel.levers[0].details.join(" ")).toContain(`After the crisis, return to: ${CENTRAL_GUARDRAILS_SETTING}`);
    expect(r.operatingModel.scopeNotes).toContain(CRISIS_SCOPE_NOTE);
  });

  it("tier ≥ III, non-federal: human final decision as Splitline's design setting with the DADM reference", () => {
    const forced = run(makeCase("bc private tier IV", { ...EDGE.privateInsurerClaims.intake, aiDecisionRole: "decides_alone", dataCategories: ["health"], affectedPeople: ["patients"] }, CONSEQUENTIAL_DECOMPOSITION));
    expect(["III", "IV"]).toContain(forced.tier.level);
    const text = forced.operatingModel.levers[0].details.join(" ");
    expect(text).toContain(HFD_NON_FEDERAL);
    expect(text).toContain("Applies to: s2");
    expect(text).not.toContain("the Directive requires");
    // Below tier III: no human-final-decision line.
    const low = run(EDGE.noPersonalData);
    expect(low.tier.level).toBe("I");
    expect(low.operatingModel.levers[0].details.join(" ")).not.toContain("Human final decision");
  });

  it("tier ≥ III, federal institution: the 'If your official AIA returns Level III or IV' copy", () => {
    const text = run(EDGE.federalHighTier).operatingModel.levers[0].details.join(" ");
    expect(text).toContain(HFD_FEDERAL);
    expect(text).not.toContain(HFD_NON_FEDERAL);
  });

  it("tier ≥ III with no consequential subtask names no subtasks", () => {
    const r = run(makeCase("high tier, none consequential", { aiDecisionRole: "decides_alone", dataCategories: ["health"], affectedPeople: ["patients"], reversibilityOverride: "irreversible" }, { ...PLAIN_DECOMPOSITION, confirmedNoConsequential: true }));
    expect(r.tier.level).toBe("IV");
    const text = r.operatingModel.levers[0].details.join(" ");
    expect(text).toContain(HFD_NON_FEDERAL);
    expect(text).not.toContain("Applies to:");
  });
});

describe("coordination (`02_*` §3.4)", () => {
  it("names the cadence and the review questions; tighter thresholds for high/critical error steps", () => {
    const r = run(EDGE.privateInsurerClaims);
    const co = r.operatingModel.levers[1];
    expect(co.setting).toContain("split review quarterly");
    expect(co.details.join(" ")).toContain("What is now automated?");
    expect(co.details.join(" ")).toContain("tighter escalation thresholds");
    expect(co.details.join(" ")).toContain("s2 Step s2");
  });

  it("no high-error steps → no threshold line; derived dynamism is labelled", () => {
    const co = levers(makeCase("gen ai", { aiType: "generative_llm" }))[1];
    expect(co.setting).toContain("monthly");
    expect(co.details.join(" ")).not.toContain("tighter escalation thresholds");
    expect(co.details.join(" ")).toContain("derived from the AI type");
    const set = levers(makeCase("set dynamism", { dynamism: "medium" }))[1];
    expect(set.setting).toContain("every 2 months");
    expect(set.details.join(" ")).not.toContain("derived from the AI type");
  });
});

describe("exchange (`02_*` §3.5)", () => {
  it("separate AI team → weekly joint session", () => {
    expect(levers(makeCase("sep", { teamSetup: "separate_ai_team" }))[2].setting).toContain("Weekly joint working session");
  });
  it("embedded → rotating AI steward", () => {
    expect(levers(makeCase("emb", { teamSetup: "embedded" }))[2].setting).toContain("rotating AI steward");
  });
  it("vendor-run → vendor sessions + internal AI steward (ADR-0016 §5)", () => {
    const ex = levers(makeCase("vendor", { teamSetup: "vendor_run" }))[2];
    expect(ex.setting).toContain("vendor's delivery team");
    expect(ex.details.join(" ")).toContain("Agree with the vendor");
  });
  it("always: correction channel and protected time (retained differentiation)", () => {
    const ex = levers(EDGE.noPersonalData)[2];
    expect(ex.details.join(" ")).toContain("Correction channel");
    expect(ex.details.join(" ")).toContain("Protected time");
  });
  it("low readiness → gradual ramp, enablement first", () => {
    const r = run(EDGE.lowReadiness);
    expect(r.operatingModel.levers[2].setting.startsWith(GRADUAL_RAMP_SETTING)).toBe(true);
    expect(r.operatingModel.levers[2].details.join(" ")).toContain("Gradual ramp: start with enablement");
    expect(r.operatingModel.scopeNotes).toContain(LOW_READINESS_SCOPE_NOTE);
  });
});
