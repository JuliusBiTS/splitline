import type { Metadata } from "next";
import { formatIsoDate } from "@/components/splitline/format";
import { RuleCardList } from "@/components/splitline/rule-card";
import { SplitMap } from "@/components/splitline/split-map";
import { StatusBadge } from "@/components/splitline/status-badge";
import { ruleCountSummary } from "@/components/splitline/status-badge.logic";
import { VerdictCard } from "@/components/splitline/verdict-card";
import { computePreset, PRESET_AS_OF, ruleCardsFor, rulesBySeverity, subtaskNames } from "@/components/workspace/model";
import { getRule } from "@/content/rules";
import { SELF_ASSESSMENT } from "@/content/self-assessment";
import { DISCLAIMER_LONG } from "@/engine";
import { CADENCE_LABELS } from "@/engine/cadence";
import { STARTING_SPLIT_LABEL } from "@/engine/split";

export const metadata: Metadata = {
  title: "Self-assessment",
  description: "Splitline assessed by its own engine.",
};

/** SPEC §4: Splitline run through its own engine from a committed intake. */
export default function SelfAssessmentPage() {
  const p = SELF_ASSESSMENT;
  const r = computePreset(p);
  const top = ruleCardsFor(r, r.verdict.topConditions);
  const names = subtaskNames(p.decomposition);
  return (
    <main id="main" className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-8 px-4 py-10 sm:px-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[40px]">Self-assessment</h1>
        <p className="text-[17px] leading-relaxed text-ink-2">
          Splitline, run through its own engine. The intake is committed in the repository, so anyone can check it. The
          result below is computed by the same rules as every preset (as of {formatIsoDate(PRESET_AS_OF)}).
        </p>
      </header>

      <section aria-labelledby="facts" className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <h2 id="facts" className="text-lg font-semibold text-ink">
          What we told the engine
        </h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] text-ink-2">
          <li>
            <strong className="font-semibold text-ink">Where the AI runs:</strong> Claude API inference runs in the US or
            globally. There is no Canadian inference location, so the intake says &ldquo;US or global API&rdquo;.
          </li>
          <li>
            <strong className="font-semibold text-ink">Data:</strong> no personal information. The intake asks you not to enter
            any, every demo organization is fictional, and nothing is stored on a server.
          </li>
          <li>
            <strong className="font-semibold text-ink">AI role:</strong> the language model proposes a subtask breakdown that
            you confirm, and writes a narrative from the engine&apos;s facts. It never decides tiers, rules or verdicts.
          </li>
          <li>
            <strong className="font-semibold text-ink">Organization type:</strong> treated as a BC private-sector organization,
            the closest intake option for an independent portfolio project.
          </li>
        </ul>
      </section>

      <VerdictCard
        verdict={r.verdict.verdict}
        tier={r.tier.level}
        reason="The engine finds no blocker. Sending text to a third-party model provider likely brings in a regulator draft on vendor due diligence, which adds conditions but cannot block."
        ruleSummary={ruleCountSummary(r.triggeredRules.map((t) => ({ effectiveStatus: t.effectiveStatus, draft: !!getRule(t.ruleId)?.draft })))}
        topConditions={top.map((c) => ({ id: c.ruleId, title: c.title, badge: <StatusBadge model={c.badge} size="inline" /> }))}
        costs={[]}
        disclaimer={DISCLAIMER_LONG}
      />

      <section aria-labelledby="why-tier" className="flex flex-col gap-2">
        <h2 id="why-tier" className="text-xl font-semibold text-ink">
          Why this tier
        </h2>
        <ul className="list-disc space-y-1 pl-5 text-[15px] text-ink-2">
          {r.tier.rationale.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="sa-rules" className="flex flex-col gap-3">
        <h2 id="sa-rules" className="text-xl font-semibold text-ink">
          Rules that likely apply ({r.triggeredRules.length})
        </h2>
        <RuleCardList rules={rulesBySeverity(r)} />
      </section>

      <section aria-labelledby="sa-split" className="flex flex-col gap-3">
        <h2 id="sa-split" className="text-xl font-semibold text-ink">
          Splitline&apos;s own split
        </h2>
        <SplitMap
          rows={r.operatingModel.split.map((s) => ({ subtaskId: s.subtaskId, name: names.get(s.subtaskId) ?? s.subtaskId, owner: s.owner, reason: s.reason }))}
          startingSplitLabel={STARTING_SPLIT_LABEL}
          reviewNote={`Split review ${CADENCE_LABELS[r.operatingModel.splitReviewCadence]} · next review ${formatIsoDate(r.operatingModel.nextReviewDate)}`}
        />
      </section>

      <p className="border-t border-divider pt-4 text-[13px] text-muted-foreground">{DISCLAIMER_LONG}</p>
    </main>
  );
}
