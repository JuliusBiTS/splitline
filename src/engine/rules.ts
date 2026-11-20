/**
 * Rule evaluation (SPEC §7.1, ADR-0007, ADR-0012): effective status, severity cap, matched facts.
 */
import { renderFact } from "./labels";
import type { CaseFacts, FactKey, RuleDefinition, RuleStatus, Severity, TierFactorKey, TriggeredRule } from "./types";

const SEVERITY_ORDER: readonly Severity[] = ["info", "action", "blocker"];

export function severityRank(s: Severity): number {
  return SEVERITY_ORDER.indexOf(s);
}

export function minSeverity(a: Severity, b: Severity): Severity {
  return severityRank(a) <= severityRank(b) ? a : b;
}

/** Effective status: the rule's status inside its scope, else `statusWhenOutOfScope` (default REFERENCE). */
export function effectiveStatusOf(rule: Pick<RuleDefinition, "status" | "statusWhenOutOfScope">, inScope: boolean): RuleStatus {
  return inScope ? rule.status : (rule.statusWhenOutOfScope ?? "REFERENCE");
}

/**
 * Maximum severity for an effective status (SPEC §7.1 table). A PROPOSED bill can never change
 * the verdict, and a draft can never block.
 */
export function severityCap(effectiveStatus: RuleStatus, opts: { inScope: boolean; draft: boolean }): Severity {
  switch (effectiveStatus) {
    case "IN_FORCE":
    case "IN_FORCE_FUTURE":
      return "blocker";
    case "GOVERNMENT_POLICY":
      return opts.inScope ? "blocker" : "info";
    case "REGULATOR_GUIDANCE":
      return opts.draft ? "action" : "blocker";
    case "PROPOSED":
    case "VOLUNTARY":
    case "REFERENCE":
      return "info";
  }
}

/** UI label per effective status (SPEC §7.1). */
export function statusLabel(
  rule: Pick<RuleDefinition, "status" | "effectiveDate" | "draft" | "scopeLabel">,
  t: Pick<TriggeredRule, "effectiveStatus" | "inScope">,
): string {
  const scope = rule.scopeLabel ?? "its scope";
  if (!t.inScope && rule.status === "GOVERNMENT_POLICY") return `Mandatory for ${scope}; reference elsewhere`;
  switch (t.effectiveStatus) {
    case "IN_FORCE":
      return "Applies";
    case "IN_FORCE_FUTURE":
      return `Applies from ${rule.effectiveDate ?? "a future date"}`;
    case "GOVERNMENT_POLICY":
      return `Mandatory for ${scope}`;
    case "REGULATOR_GUIDANCE":
      return rule.draft
        ? `Regulator draft (consultation until ${rule.draft.consultationEnds ?? "a date to be announced"})`
        : "Regulator expects";
    case "PROPOSED":
      return "Prepare for (proposed)";
    case "VOLUNTARY":
      return "Good practice";
    case "REFERENCE":
      return "Reference framework";
  }
}

/** Which tier factors a rule's facts overlap with (top-3 ranking, step 3). */
const FACT_TO_TIER_FACTOR: Partial<Record<FactKey, TierFactorKey>> = {
  aiDecisionRole: "aiDecisionRole",
  consequential: "consequential",
  dataCategories: "dataSensitivity",
  affectedPeople: "affectedPeople",
  customerFacingOutput: "customerFacingGenerative",
};

export const UNSURE_HOSTING_ACTION = "Confirm the vendor's processing and storage region.";

export function evaluateRule(
  rule: RuleDefinition,
  c: CaseFacts,
  topTierFactors: readonly TierFactorKey[] = [],
): TriggeredRule | null {
  if (!rule.appliesWhen(c)) return null;
  const inScope = rule.inScope ? rule.inScope(c) : true;
  const effectiveStatus = effectiveStatusOf(rule, inScope);
  const draft = effectiveStatus === "REGULATOR_GUIDANCE" && rule.draft !== undefined;
  const requestedSeverity = rule.severity(c);
  const severity = minSeverity(requestedSeverity, severityCap(effectiveStatus, { inScope, draft }));

  const actions = [...rule.actionsToConsider, ...(rule.extraActions?.(c) ?? [])];
  if (rule.reads.includes("hosting") && c.hostingUnknown && !actions.includes(UNSURE_HOSTING_ACTION)) {
    actions.push(UNSURE_HOSTING_ACTION);
  }

  return {
    ruleId: rule.id,
    effectiveStatus,
    inScope,
    severity,
    requestedSeverity,
    matchedFacts: rule.reads.map((k) => renderFact(k, c)),
    notes: rule.notes?.(c) ?? [],
    actions,
    tierFactorMatch: rule.reads.some((k) => {
      const tf = FACT_TO_TIER_FACTOR[k];
      return tf !== undefined && topTierFactors.includes(tf);
    }),
  };
}

/** Evaluates the catalogue in catalogue order. */
export function evaluateRules(
  catalogue: readonly RuleDefinition[],
  c: CaseFacts,
  topTierFactors: readonly TierFactorKey[] = [],
): TriggeredRule[] {
  const out: TriggeredRule[] = [];
  for (const rule of catalogue) {
    const t = evaluateRule(rule, c, topTierFactors);
    if (t) out.push(t);
  }
  return out;
}
