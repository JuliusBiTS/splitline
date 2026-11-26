/**
 * Template narrative: the deterministic fallback when live mode is off, the model fails or the
 * guard rejects the output twice (SPEC §8). Built from the same engine facts the model sees, so it
 * passes the guard by construction (tested for every fixture case).
 */
import type { Narrative } from "@/engine/types";
import type { NarrationFacts } from "./narration-facts";

/** Shortens at a word boundary so the text fits the schema limit. */
export function fit(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.]+$/, "")}…`;
}

const joinList = (items: readonly string[]) =>
  items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

const sentence = (s: string) => (/[.!?…]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

export function templateNarrative(f: NarrationFacts): Narrative {
  const conditionText =
    f.conditions.length > 0
      ? `Before you pilot, consider: ${f.conditions.map((c) => `${c.title} (${c.status === "Applies" ? "likely applies" : c.status})`).join("; ")}.`
      : "No condition needs action before a pilot.";
  const executiveSummary = fit(
    `${f.verdict} at ${f.tier.label} ${f.tier.level}. ${conditionText} ${
      f.otherRules.length > 0 ? `${f.otherRules.length} more ${f.otherRules.length === 1 ? "item is" : "items are"} for information or planning.` : ""
    }`,
    700,
  );

  const owners = [...new Set(f.split.map((s) => s.owner))];
  const byOwner = owners.map((o) => {
    const steps = f.split.filter((s) => s.owner === o).map((s) => s.step);
    return `${o}: ${joinList(steps)}`;
  });
  const splitNarrative = fit(
    `Who does what across ${f.split.length} steps. ${byOwner.map(sentence).join(" ")} ${f.splitReview.note} Next split review ${f.splitReview.cadence}, first on ${f.splitReview.nextReviewDate}.`,
    700,
  );

  const leverNarratives = f.levers.map((l) =>
    fit(`${l.name}: ${sentence(l.setting)} Keep in place: ${sentence(l.guardrail)} Direct cost: ${sentence(l.directCost)}`, 500),
  ) as [string, string, string];

  const rolloutNarrative = fit(
    `${f.rollout.map((p) => `Days ${p.days.replace(/^days\s+/i, "")}: ${p.title}`).join(". ")}. Track three KPIs: ${joinList(f.kpis)}.`,
    700,
  );

  return { executiveSummary, splitNarrative, leverNarratives, rolloutNarrative };
}
