/**
 * The rule catalogue in catalogue order (used as the last tie-break when ranking conditions).
 * Source of truth: docs/research/01_legal-landscape-canada-bc.md §3, with predicates per ADR-0012.
 */
import type { RuleDefinition } from "@/engine/types";
import { BC_RULES } from "./bc";
import { FEDERAL_RULES } from "./federal";
import { INTL_RULES } from "./intl";
import { ON_RULES } from "./on";
import { QC_RULES } from "./qc";

/** Bump whenever a rule's status, trigger, wording or sources change. */
export const RULE_CATALOGUE_VERSION = "2026-11-20.1";

export const RULE_CATALOGUE: readonly RuleDefinition[] = [
  ...BC_RULES,
  ...FEDERAL_RULES,
  ...ON_RULES,
  ...QC_RULES,
  ...INTL_RULES,
];

export function getRule(id: string): RuleDefinition | undefined {
  return RULE_CATALOGUE.find((r) => r.id === id);
}
