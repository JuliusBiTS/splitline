import { describe, expect, it } from "vitest";
import { RULE_CATALOGUE } from "@/content/rules";
import { RuleStatusSchema } from "@/engine/types";
import { ruleCountSummary, statusBadgeFor, statusLabelFor } from "./status-badge.logic";

const base = { inScope: true, rule: { status: "IN_FORCE" as const } };

describe("statusLabelFor (SPEC §7.1 label table)", () => {
  it.each([
    ["IN_FORCE", "applies", "Applies"],
    ["PROPOSED", "prepare", "Prepare for (proposed)"],
    ["REGULATOR_GUIDANCE", "regulator", "Regulator expects"],
    ["VOLUNTARY", "good", "Good practice"],
    ["REFERENCE", "reference", "Reference framework"],
  ] as const)("%s → %s / %s", (status, kind, label) => {
    expect(statusLabelFor({ ...base, effectiveStatus: status })).toEqual({ kind, label });
  });

  it("IN_FORCE_FUTURE names the effective date", () => {
    expect(
      statusLabelFor({ effectiveStatus: "IN_FORCE_FUTURE", inScope: true, rule: { status: "IN_FORCE_FUTURE", effectiveDate: "2027-01-01" } }),
    ).toEqual({ kind: "applies_future", label: "Applies from January 1, 2027" });
  });

  it("GOVERNMENT_POLICY in scope → Mandatory for <scope>", () => {
    expect(
      statusLabelFor({
        effectiveStatus: "GOVERNMENT_POLICY",
        inScope: true,
        rule: { status: "GOVERNMENT_POLICY", scopeLabel: "federal institutions" },
      }).label,
    ).toBe("Mandatory for federal institutions");
  });

  it("GOVERNMENT_POLICY out of scope → shown as reference with its scope", () => {
    expect(
      statusLabelFor({
        effectiveStatus: "REFERENCE",
        inScope: false,
        rule: { status: "GOVERNMENT_POLICY", scopeLabel: "federal institutions" },
      }),
    ).toEqual({ kind: "reference", label: "Mandatory for federal institutions; reference elsewhere" });
  });

  it("regulator draft names the consultation end", () => {
    expect(
      statusLabelFor({
        effectiveStatus: "REGULATOR_GUIDANCE",
        inScope: true,
        rule: { status: "REGULATOR_GUIDANCE", draft: { consultationEnds: "2027-02-15" } },
      }),
    ).toEqual({ kind: "regulator_draft", label: "Regulator draft (consultation until February 15, 2027)" });
  });

  it("covers every status in the schema", () => {
    for (const s of RuleStatusSchema.options) {
      expect(statusLabelFor({ ...base, effectiveStatus: s }).label.length).toBeGreaterThan(0);
    }
  });

  it("never presents a proposed bill as binding", () => {
    const { label } = statusLabelFor({ ...base, effectiveStatus: "PROPOSED" });
    expect(label).toMatch(/proposed/i);
    expect(label).not.toMatch(/applies|mandatory/i);
  });
});

describe("statusBadgeFor", () => {
  it("a blocker says Blocker but keeps the status label", () => {
    expect(
      statusBadgeFor({ effectiveStatus: "REGULATOR_GUIDANCE", severity: "blocker", inScope: true, rule: { status: "REGULATOR_GUIDANCE" } }),
    ).toEqual({ kind: "blocker", label: "Blocker", statusLabel: "Regulator expects" });
  });

  it("non-blockers show the status label", () => {
    expect(statusBadgeFor({ ...base, effectiveStatus: "IN_FORCE", severity: "action" }).label).toBe("Applies");
  });

  it("every catalogue rule gets a non-empty label", () => {
    for (const r of RULE_CATALOGUE) {
      expect(statusBadgeFor({ effectiveStatus: r.status, severity: "info", inScope: true, rule: r }).label).not.toBe("");
    }
  });
});

describe("ruleCountSummary", () => {
  const r = (effectiveStatus: Parameters<typeof ruleCountSummary>[0][number]["effectiveStatus"], draft?: boolean) => ({
    effectiveStatus,
    draft,
  });
  it("counts in force, guidance and proposed", () => {
    expect(ruleCountSummary([r("IN_FORCE"), r("IN_FORCE"), r("PROPOSED")])).toBe("2 rules in force · 1 proposed");
    expect(ruleCountSummary([r("REGULATOR_GUIDANCE"), r("IN_FORCE")])).toBe("1 rule in force · 1 regulator expectation");
  });
  it("never counts future-dated law or regulator drafts as binding today", () => {
    expect(ruleCountSummary([r("IN_FORCE_FUTURE"), r("REGULATOR_GUIDANCE", true)])).toBe(
      "1 in force from a future date · 1 regulator draft",
    );
  });
  it("handles none", () => {
    expect(ruleCountSummary([])).toBe("No rules triggered");
  });
});
