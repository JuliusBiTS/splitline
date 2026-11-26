/**
 * Narration guard (SPEC §8, PLAN Phase 5). The narrative may only name statutes whose rules
 * triggered. It also enforces the copy rules that a model is most likely to break:
 * - no rule or subtask IDs in the text (ADR-0018: no internal IDs on the main view);
 * - legal microcopy: never "compliant", "you must", "must comply" or "legal advice" (CLAUDE.md);
 * - a PROPOSED bill is only named in a sentence that says it is proposed.
 *
 * Any violation → one retry → the template narrative.
 */
import { RULE_CATALOGUE } from "@/content/rules";
import type { Narrative, RuleDefinition } from "@/engine/types";
import { buildStatuteNames, type StatuteName } from "./statute-lexicon";

export type GuardViolationKind =
  | "untriggered_statute"
  | "untriggered_rule_id"
  | "rule_id"
  | "subtask_id"
  | "banned_phrase"
  | "proposed_as_binding"
  | "never_allowed_statute"
  | "thesis_jargon"
  | "lever_missing_guardrail"
  | "lever_missing_direct_cost";

export interface GuardViolation {
  kind: GuardViolationKind;
  field: string;
  match: string;
}

const BANNED_PHRASES: readonly RegExp[] = [
  /\b(?:non-?)?compliant\b/gi,
  /\byou must\b/gi,
  /\bmust comply\b/gi,
  /\blegal advice\b/gi,
  /\b(?:required by law|legally required)\b/gi,
  // The tier is never an official AIA result (CLAUDE.md content rules).
  /\bAIA\s+(?:tier|level|score)\b/g,
];

/**
 * Laws the model may know from training that are not in the catalogue and never apply here
 * (AIDA died with Bill C-27; there is no federal AI statute; EU law is out of scope).
 */
const NEVER_ALLOWED: readonly RegExp[] = [
  /(?<![A-Za-z0-9])AIDA(?![A-Za-z0-9])/g,
  /\bArtificial Intelligence and Data Act\b/gi,
  /(?<![A-Za-z0-9])C-27(?![A-Za-z0-9])/g,
  /\bEU AI Act\b/gi,
  /(?<![A-Za-z0-9])GDPR(?![A-Za-z0-9])/g,
];

/** Thesis vocabulary that belongs in "Research basis", not on the main view (ADR-0018). */
const THESIS_JARGON = /(?<![A-Za-z0-9])P[1-4](?![A-Za-z0-9])|\bTable 4\b|\bSection \d|\breinforcement\b|\bmutual adjustment\b|\bdecision rights\b/gi;

/** A lever text must name its guardrail (the part before the colon) and its direct cost (`02_*` §1.7). */
export function guardrailKey(guardrail: string): string {
  return (guardrail.includes(":") ? guardrail.split(":")[0]! : guardrail.split(/\s+/).slice(0, 3).join(" ")).trim().toLowerCase();
}

export function directCostKey(directCost: string): string {
  const head = directCost.includes(":") ? directCost.split(":")[0]! : directCost;
  return head.replace(/^some\s+/i, "").split(/\s+/).slice(0, 2).join(" ").trim().toLowerCase();
}

/** Rule-ID-shaped tokens with a catalogue prefix, including made-up ones ("BC-PIPA-07"). */
const RULE_ID_SHAPE = /(?<![A-Za-z0-9-])(?:BC|FED|ON|QC|INS|LIAB|REF|OSFI|VC|HC|ISO)(?:-[A-Z0-9]+)+(?![A-Za-z0-9-])/g;
const SUBTASK_ID = /(?<![A-Za-z0-9])s[1-8](?![A-Za-z0-9])/g;

export function narrativeFields(n: Narrative): Array<[string, string]> {
  return [
    ["executiveSummary", n.executiveSummary],
    ["splitNarrative", n.splitNarrative],
    ["leverNarratives.0", n.leverNarratives[0]],
    ["leverNarratives.1", n.leverNarratives[1]],
    ["leverNarratives.2", n.leverNarratives[2]],
    ["rolloutNarrative", n.rolloutNarrative],
  ];
}

const sentences = (text: string) => text.split(/(?<=[.!?;:])\s+|\n+/).filter(Boolean);

export interface GuardOptions {
  catalogue?: readonly RuleDefinition[];
  statuteNames?: readonly StatuteName[];
  /** User-chosen names (case title, step names). Masked before the checks: a step the user named "s1" is not an ID. */
  userNames?: readonly string[];
  /** The three levers from the facts, in narrative order; each lever text must keep its guardrail and direct cost. */
  levers?: ReadonlyArray<{ guardrail: string; directCost: string }>;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function maskNames(text: string, names: readonly string[]): string {
  return [...names]
    .filter((n) => n.trim().length > 0)
    .sort((a, b) => b.length - a.length)
    .reduce((t, name) => t.replace(new RegExp(escapeRegExp(name), "g"), " "), text);
}

export function checkNarrative(
  narrative: Narrative,
  triggeredRuleIds: readonly string[],
  opts: GuardOptions = {},
): GuardViolation[] {
  const catalogue = opts.catalogue ?? RULE_CATALOGUE;
  const names = opts.statuteNames ?? buildStatuteNames();
  const triggered = new Set(triggeredRuleIds);
  const catalogueIds = new Set(catalogue.map((r) => r.id));
  const proposedIds = new Set(catalogue.filter((r) => r.status === "PROPOSED").map((r) => r.id));
  const proposedNames = names.filter((n) => n.ruleIds.every((id) => proposedIds.has(id)));
  const out: GuardViolation[] = [];

  for (const [field, raw] of narrativeFields(narrative)) {
    const text = maskNames(raw, opts.userNames ?? []);
    for (const m of text.matchAll(RULE_ID_SHAPE)) {
      const id = m[0];
      const kind = catalogueIds.has(id) && triggered.has(id) ? "rule_id" : "untriggered_rule_id";
      out.push({ kind, field, match: id });
    }
    for (const m of text.matchAll(SUBTASK_ID)) out.push({ kind: "subtask_id", field, match: m[0] });
    for (const re of BANNED_PHRASES) {
      for (const m of text.matchAll(re)) out.push({ kind: "banned_phrase", field, match: m[0] });
    }
    for (const n of names) {
      if (n.ruleIds.some((id) => triggered.has(id))) continue;
      for (const m of text.matchAll(n.pattern)) out.push({ kind: "untriggered_statute", field, match: m[0] });
    }
    for (const sentence of sentences(text)) {
      if (/\bpropos/i.test(sentence)) continue;
      for (const n of proposedNames) {
        const m = sentence.match(new RegExp(n.pattern.source, n.pattern.flags.replace("g", "")));
        if (m) out.push({ kind: "proposed_as_binding", field, match: m[0] });
      }
    }
    for (const re of NEVER_ALLOWED) {
      for (const m of text.matchAll(re)) out.push({ kind: "never_allowed_statute", field, match: m[0] });
    }
    for (const m of text.matchAll(THESIS_JARGON)) out.push({ kind: "thesis_jargon", field, match: m[0] });
  }
  (opts.levers ?? []).forEach((lever, i) => {
    const field = `leverNarratives.${i}`;
    const text = (narrative.leverNarratives[i] ?? "").toLowerCase();
    const g = guardrailKey(lever.guardrail);
    const c = directCostKey(lever.directCost);
    if (!text.includes(g)) out.push({ kind: "lever_missing_guardrail", field, match: g });
    if (!text.includes(c)) out.push({ kind: "lever_missing_direct_cost", field, match: c });
  });
  return out;
}
