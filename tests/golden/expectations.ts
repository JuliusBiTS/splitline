/**
 * SPEC §10 golden expectations, shared by the golden tests and `pnpm eval:engine`.
 * Tiers are exact (ADR-0004); the hiring tier is pinned at IV in ADR-0004.
 */
import type { OperatingModel, RuleStatus, Severity, SplitOwner, TierLevel, Verdict } from "@/engine/types";

export interface StatusExpectation {
  ruleId: string;
  effectiveStatus?: RuleStatus;
  /** Exact effective severity. */
  severity?: Severity;
  /** Upper bound on effective severity. */
  maxSeverity?: Severity;
  /** The rule may trigger, but not with this effective status. */
  notStatus?: RuleStatus;
}

export interface GoldenExpectation {
  slug: string;
  tier: TierLevel;
  verdict: Verdict;
  mustTrigger: string[];
  mustNotTrigger: string[];
  statuses: StatusExpectation[];
  /** Expected starting split owner per key subtask (02_* §3.2, ADR-0016). */
  split: Record<string, SplitOwner>;
  /** Expected drift-check gaps (02_* §3.6). */
  driftMissing: OperatingModel["driftCheck"]["missing"];
}

export const GOLDEN: readonly GoldenExpectation[] = [
  {
    slug: "clinical-referral-triage",
    split: { s1: "machine", s2: "machine", s3: "human", s4: "machine_review", s5: "human" },
    driftMissing: ["augmentation_value", "learning_loop"],
    tier: "III",
    verdict: "go_with_conditions",
    mustTrigger: ["BC-FIPPA-01", "BC-FIPPA-XB", "HC-SAMD-01", "FED-DADM-HITL", "VC-GENAI-MGR"],
    mustNotTrigger: ["BC-PIPA-01"],
    statuses: [
      { ruleId: "FED-DADM-HITL", effectiveStatus: "REFERENCE", severity: "info" },
      // Public body: FED-OPC-VENDOR may only appear as REFERENCE.
      { ruleId: "FED-OPC-VENDOR", notStatus: "REGULATOR_GUIDANCE", maxSeverity: "info" },
    ],
  },
  {
    slug: "contract-clause-review",
    split: { s1: "machine", s2: "machine_review", s3: "machine_review", s4: "machine_review" },
    driftMissing: ["augmentation_value", "learning_loop"],
    tier: "II",
    verdict: "go_with_conditions",
    mustTrigger: ["BC-PIPA-01", "FED-PIPEDA-XB", "FED-OPC-VENDOR", "FED-C36-XB"],
    mustNotTrigger: ["HC-SAMD-01"],
    statuses: [
      { ruleId: "FED-OPC-VENDOR", effectiveStatus: "REGULATOR_GUIDANCE", maxSeverity: "action" },
      { ruleId: "FED-C36-XB", effectiveStatus: "PROPOSED", severity: "info" },
    ],
  },
  {
    slug: "hiring-and-sentiment",
    split: { s1: "machine", s2: "human", s3: "human", s4: "machine_review", s5: "human" },
    // HR preset KPIs are efficiency-only ("Time to shortlist", "Cost per hire") → drift warning.
    driftMissing: ["augmentation_value", "learning_loop"],
    tier: "IV",
    verdict: "redesign",
    mustTrigger: ["BC-PIPA-EMP", "BC-PIPA-MON", "BC-HRC-01"],
    mustNotTrigger: ["BC-FIPPA-01", "FED-C36-ADM"],
    statuses: [{ ruleId: "BC-PIPA-MON", effectiveStatus: "REGULATOR_GUIDANCE", severity: "blocker" }],
  },
  {
    slug: "claims-document-intake",
    split: { s1: "machine", s2: "machine", s3: "machine_review", s4: "machine_review", s5: "machine_review" },
    driftMissing: ["augmentation_value"],
    tier: "II",
    verdict: "go_with_conditions",
    mustTrigger: ["BC-FIPPA-01", "BC-FIPPA-XB", "INS-FAIR", "BC-HRC-01"],
    mustNotTrigger: ["HC-SAMD-01"],
    statuses: [{ ruleId: "INS-FAIR", effectiveStatus: "REFERENCE", severity: "info" }],
  },
];
