/**
 * StatusBadge logic: rule status → badge kind and label. Labels follow SPEC §7.1 exactly;
 * the design (ADR-0005) gives each kind a colour pair AND an icon, so status is never colour alone.
 */
import type { RuleMeta, RuleStatus, Severity } from "@/engine/types";
import { formatIsoDate } from "./format";

export type StatusKind =
  | "applies"
  | "applies_future"
  | "mandatory"
  | "regulator"
  | "regulator_draft"
  | "prepare"
  | "good"
  | "reference"
  | "blocker";

export interface StatusBadgeModel {
  kind: StatusKind;
  /** Text on the badge. "Blocker" when the effective severity is blocker. */
  label: string;
  /** The status label per SPEC §7.1, always available so a Blocker badge never hides the status. */
  statusLabel: string;
}

export type StatusRuleMeta = Pick<RuleMeta, "status" | "effectiveDate" | "scopeLabel" | "draft">;

export interface StatusInput {
  effectiveStatus: RuleStatus;
  severity: Severity;
  inScope: boolean;
  rule: StatusRuleMeta;
}

/** SPEC §7.1 "UI label" column. */
export function statusLabelFor({ effectiveStatus, inScope, rule }: Omit<StatusInput, "severity">): {
  kind: Exclude<StatusKind, "blocker">;
  label: string;
} {
  switch (effectiveStatus) {
    case "IN_FORCE":
      return { kind: "applies", label: "Applies" };
    case "IN_FORCE_FUTURE":
      return {
        kind: "applies_future",
        label: rule.effectiveDate ? `Applies from ${formatIsoDate(rule.effectiveDate)}` : "Applies from a future date",
      };
    case "GOVERNMENT_POLICY":
      return { kind: "mandatory", label: rule.scopeLabel ? `Mandatory for ${rule.scopeLabel}` : "Mandatory for government bodies" };
    case "REGULATOR_GUIDANCE":
      if (rule.draft) {
        const until = rule.draft.consultationEnds;
        return {
          kind: "regulator_draft",
          label: until ? `Regulator draft (consultation until ${formatIsoDate(until)})` : "Regulator draft",
        };
      }
      return { kind: "regulator", label: "Regulator expects" };
    case "PROPOSED":
      return { kind: "prepare", label: "Prepare for (proposed)" };
    case "VOLUNTARY":
      return { kind: "good", label: "Good practice" };
    case "REFERENCE":
      if (!inScope && rule.status === "GOVERNMENT_POLICY" && rule.scopeLabel) {
        return { kind: "reference", label: `Mandatory for ${rule.scopeLabel}; reference elsewhere` };
      }
      return { kind: "reference", label: "Reference framework" };
  }
}

export function statusBadgeFor(input: StatusInput): StatusBadgeModel {
  const { kind, label } = statusLabelFor(input);
  if (input.severity === "blocker") return { kind: "blocker", label: "Blocker", statusLabel: label };
  return { kind, label, statusLabel: label };
}

export interface CountedRule {
  effectiveStatus: RuleStatus;
  /** True for regulator guidance that is still a consultation draft. */
  draft?: boolean;
}

/**
 * "2 rules in force · 1 proposed" (VerdictCard footer). Only what binds today counts as "in force"
 * (IN_FORCE, GOVERNMENT_POLICY in scope); future-dated law and regulator drafts are counted apart,
 * so nothing reads as more binding than it is (SPEC §7.1).
 */
export function ruleCountSummary(rules: readonly CountedRule[]): string {
  const n = (p: (r: CountedRule) => boolean) => rules.filter(p).length;
  const inForce = n((r) => r.effectiveStatus === "IN_FORCE" || r.effectiveStatus === "GOVERNMENT_POLICY");
  const future = n((r) => r.effectiveStatus === "IN_FORCE_FUTURE");
  const guidance = n((r) => r.effectiveStatus === "REGULATOR_GUIDANCE" && !r.draft);
  const drafts = n((r) => r.effectiveStatus === "REGULATOR_GUIDANCE" && !!r.draft);
  const proposed = n((r) => r.effectiveStatus === "PROPOSED");
  const other = rules.length - inForce - future - guidance - drafts - proposed;
  const parts = [
    inForce > 0 ? `${inForce} ${inForce === 1 ? "rule" : "rules"} in force` : null,
    future > 0 ? `${future} in force from a future date` : null,
    guidance > 0 ? `${guidance} regulator ${guidance === 1 ? "expectation" : "expectations"}` : null,
    drafts > 0 ? `${drafts} regulator ${drafts === 1 ? "draft" : "drafts"}` : null,
    proposed > 0 ? `${proposed} proposed` : null,
    other > 0 ? `${other} good practice or reference` : null,
  ].filter((p): p is string => p !== null);
  return parts.length > 0 ? parts.join(" · ") : "No rules triggered";
}
