/**
 * One-page charter (SPEC §11, ADR-0018): a pure view model shared by the Markdown download and the
 * print view. Manager language only: plain owner and setting labels, no rule or step IDs, no
 * thesis jargon. Every lever keeps its guardrail and direct cost (`02_*` §1.7).
 */
import { formatIsoDate } from "@/components/splitline/format";
import { OWNER_LABELS } from "@/components/splitline/split-map.logic";
import { EFFORT_LABELS, PLANNING_ESTIMATE_NOTE } from "@/components/splitline/rule-card.logic";
import { statusLabelFor } from "@/components/splitline/status-badge.logic";
import { getRule } from "@/content/rules";
import type { NarrativeView } from "@/content/presets/narratives";
import { DISCLAIMER_LONG, type EngineResult } from "@/engine";
import { CADENCE_LABELS } from "@/engine/cadence";
import { COST_ESTIMATE_NOTE } from "@/engine/costs";
import { DIRECT_COST_PLAIN, LEVER_PLAIN_NAMES } from "@/engine/levers";
import { TIER_LABEL } from "@/engine/tier";
import type { ConfirmedDecomposition, Deliverable, KpiKind } from "@/engine/types";

export const KPI_KIND_LABELS: Record<KpiKind, string> = {
  efficiency: "Speed and volume",
  augmentation_value: "Better work with the AI",
  learning_loop: "Corrections flowing back",
};

export interface CharterInput {
  title: string;
  /** ISO date the results are computed for. */
  asOf: string;
  result: EngineResult;
  decomposition: ConfirmedDecomposition;
  /** Why the verdict is what it is (authored for presets, engine-built for cases). */
  reason: string;
  narrative?: NarrativeView | null;
  /** Absolute URL of this case or preset (charter footer). */
  url: string;
}

export interface CharterModel {
  title: string;
  date: string;
  tierLine: string;
  verdict: string;
  reason: string;
  inBrief: { text: string; provenance: string } | null;
  conditions: { title: string; status: string; owner: string; effort: string }[];
  split: { step: string; owner: string }[];
  nextReview: string;
  levers: { name: string; setting: string; keep: string; directCost: string; estimates: string[] }[];
  reviewEstimates: string[];
  /** `highlights` are the short deliverable headlines for the one-page print; `deliverables` are full, with owners. */
  phases: { days: string; title: string; deliverables: string[]; highlights: string[]; gate: string[] }[];
  kpis: { kind: string; name: string }[];
  rules: { title: string; status: string; instrument: string; sources: { label: string; url: string }[]; verified: string }[];
  notes: string[];
  disclaimer: string;
  url: string;
}

export function charterModel(input: CharterInput): CharterModel {
  const r = input.result;
  const names = new Map(input.decomposition.subtasks.map((s) => [s.id, s.name]));
  const statusOf = (id: string) => {
    const t = r.triggeredRules.find((x) => x.ruleId === id);
    const meta = getRule(id);
    return t && meta ? statusLabelFor({ effectiveStatus: t.effectiveStatus, inScope: t.inScope, rule: meta }).label : "";
  };
  const estimates = new Map(r.operatingModel.costEstimates.map((c) => [c.topic, c.lines]));
  return {
    title: input.title,
    date: formatIsoDate(input.asOf),
    tierLine: `${TIER_LABEL}: ${r.tier.level}`,
    verdict: r.verdict.label,
    reason: input.reason,
    inBrief: input.narrative ? { text: input.narrative.narrative.executiveSummary, provenance: input.narrative.provenance } : null,
    conditions: r.verdict.topConditions.flatMap((id) => {
      const meta = getRule(id);
      return meta
        ? [{ title: meta.title, status: statusOf(id), owner: meta.ownerRole ?? "To be assigned", effort: meta.effort ? EFFORT_LABELS[meta.effort] : "Not estimated" }]
        : [];
    }),
    split: r.operatingModel.split.map((s) => ({ step: names.get(s.subtaskId) ?? "Unnamed step", owner: OWNER_LABELS[s.owner] })),
    nextReview: `This is a starting split: it will move. Next split review: ${formatIsoDate(r.operatingModel.nextReviewDate)} (${CADENCE_LABELS[r.operatingModel.splitReviewCadence]}).`,
    levers: r.operatingModel.levers.map((l) => ({
      name: LEVER_PLAIN_NAMES[l.lever],
      setting: l.setting,
      keep: l.guardrail,
      directCost: DIRECT_COST_PLAIN[l.lever],
      estimates: estimates.get(l.lever) ?? [],
    })),
    reviewEstimates: estimates.get("review") ?? [],
    phases: r.rollout.phases.map((p) => ({
      days: p.days,
      title: p.title,
      deliverables: p.deliverables.map((d) => `${d.text} (likely owner: ${d.ownerRole})`),
      // Two deliverables from one rule share a headline; show it once.
      highlights: [...new Set(p.deliverables.map((d) => shortDeliverable(d)))],
      gate: p.gateCriteria.map((g) => g.replace(/\.$/, "")),
    })),
    kpis: r.rollout.kpis.map((k) => ({ kind: KPI_KIND_LABELS[k.kind], name: k.name })),
    rules: r.triggeredRules.flatMap((t) => {
      const meta = getRule(t.ruleId);
      return meta
        ? [{ title: meta.title, status: statusOf(t.ruleId), instrument: meta.instrument, sources: meta.sources, verified: formatIsoDate(meta.lastVerified) }]
        : [];
    }),
    notes: [PLANNING_ESTIMATE_NOTE, COST_ESTIMATE_NOTE],
    disclaimer: DISCLAIMER_LONG,
    url: input.url,
  };
}

/**
 * Headline of a deliverable for the printed page. Rule deliverables are named by the rule title
 * (keeping an "Applies from <date>" or "Prepare for (proposed)" prefix); others by the part before
 * the first colon ("Set up the shared platform: …") or their first sentence, capped.
 */
export function shortDeliverable(d: Pick<Deliverable, "text" | "source">): string {
  const prefix = /^(Applies from [^:]+|Prepare for \(proposed\)): /.exec(d.text)?.[0] ?? "";
  if (d.source.kind === "rule") {
    const title = getRule(d.source.ruleId)?.title;
    if (title) return prefix + title;
  }
  const rest = d.text.slice(prefix.length);
  const colon = rest.indexOf(": ");
  if (colon >= 10 && colon <= 90) return prefix + rest.slice(0, colon);
  const sentence = /^(.+?[.;])(\s|$)/.exec(rest)?.[1] ?? rest;
  const capped = sentence.length > 100 ? `${sentence.slice(0, 97).replace(/[\s,(]+\S*$/, "")}…` : sentence;
  return prefix + capped.replace(/[.;]$/, "");
}

const bullets = (items: readonly string[]) => items.map((i) => `- ${i}`).join("\n");
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

export function charterMarkdown(input: CharterInput): string {
  const m = charterModel(input);
  const out: string[] = [];
  out.push(`# Splitline charter: ${m.title}`, "");
  out.push(`${m.date} · ${m.tierLine} · Verdict: **${m.verdict}**`, "");
  out.push(m.reason, "");
  if (m.inBrief) out.push("## In brief", "", m.inBrief.text, "", `_${m.inBrief.provenance}_`, "");
  out.push("## Before you pilot", "");
  out.push(
    m.conditions.length > 0
      ? bullets(m.conditions.map((c) => `**${c.title}** (${c.status}). Likely owner: ${c.owner}. Rough effort: ${c.effort}.`))
      : "No rule here likely adds a condition before a pilot.",
    "",
  );
  out.push("## Who does what", "", "| Step | Who does it |", "| --- | --- |", ...m.split.map((s) => `| ${cell(s.step)} | ${cell(s.owner)} |`), "", m.nextReview, "");
  out.push("## How the team runs it, and what it costs", "");
  for (const l of m.levers) {
    out.push(`### ${l.name}`, "", l.setting, "", `- Keep in place: ${l.keep}`, `- Direct cost: ${l.directCost}`, ...l.estimates.map((e) => `- Estimate: ${e}`), "");
  }
  if (m.reviewEstimates.length > 0) out.push("### People checking AI output", "", bullets(m.reviewEstimates.map((e) => `Estimate: ${e}`)), "");
  out.push("## 90-day plan", "");
  for (const p of m.phases) {
    out.push(`### ${p.days}: ${p.title}`, "", bullets(p.deliverables), "", `Gate to the next phase: ${p.gate.join("; ")}`, "");
  }
  out.push("## KPIs", "", bullets(m.kpis.map((k) => `${k.kind}: ${k.name}`)), "");
  out.push("## Triggered rules", "", "| Rule | Status | Instrument | Sources | Last verified |", "| --- | --- | --- | --- | --- |");
  out.push(...m.rules.map((r) => `| ${cell(r.title)} | ${cell(r.status)} | ${cell(r.instrument)} | ${r.sources.map((s) => `[${cell(s.label)}](${s.url})`).join(", ")} | ${r.verified} |`), "");
  out.push("---", "", ...m.notes.map((n) => `_${n}_`), "", `**${m.disclaimer}**`, "", `Made with Splitline: ${m.url}`, "");
  return out.join("\n");
}

/** File name for downloads: ASCII slug of the title. */
export function charterFileName(title: string, ext: "md" | "json", prefix = "splitline-charter"): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .slice(0, 50);
  return `${prefix}-${slug || "case"}.${ext}`;
}
