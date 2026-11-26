/**
 * Workspace tab panels (server components). Everything shown comes from the engine result; copy
 * constants come from the engine so thesis and legal wording stay in one place.
 *
 * Two-layer language (ADR-0018): manager terms on the main view; thesis terms, propositions and the
 * scope disclosure in "Research basis" disclosures. Guardrail and cost are always visible per lever.
 */
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatIsoDate } from "@/components/splitline/format";
import { LeverCard } from "@/components/splitline/lever-card";
import { ResearchBasis } from "@/components/splitline/research-basis";
import { RuleCardList } from "@/components/splitline/rule-card";
import { PLANNING_ESTIMATE_NOTE } from "@/components/splitline/rule-card.logic";
import { SplitMap } from "@/components/splitline/split-map";
import { OWNER_LABELS, OWNER_LABELS_RESEARCH, OWNERS } from "@/components/splitline/split-map.logic";
import { ruleCountSummary } from "@/components/splitline/status-badge.logic";
import { TierChip, VerdictCard } from "@/components/splitline/verdict-card";
import { buttonVariants } from "@/components/ui/button";
import { getRule } from "@/content/rules";
import { DISCLAIMER_LONG, type EngineResult } from "@/engine";
import { CADENCE_LABELS } from "@/engine/cadence";
import { COST_ESTIMATE_NOTE } from "@/engine/costs";
import {
  DIRECT_COST_PLAIN,
  LEVER_INDICATORS_LABEL_PLAIN,
  LEVER_NAMES,
  LEVER_PLAIN_NAMES,
  REINFORCEMENT_PLAIN,
  REINFORCEMENT_RESEARCH,
  SCOPE_NOTE_RESEARCH_REFS,
  TABLE_4,
  THESIS_SCOPE_DISCLOSURE,
  THESIS_SCOPE_NOTE_PLAIN,
  TRADE_OFF_NOTE,
} from "@/engine/levers";
import { TIER_LABEL } from "@/engine/tier";
import type { ConfirmedDecomposition, CostEstimate, KpiKind, LeverKey } from "@/engine/types";
import { cn } from "@/lib/utils";
import { rulesBySeverity, ruleCardsFor, subtaskNames, type InventoryRecord } from "./model";
import { TabLinkButton } from "./workspace-tabs";
import { OpenWhatIfButton } from "./open-what-if-button";

function H2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-xl font-semibold text-ink">
      {children}
    </h2>
  );
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-8", className)}>{children}</div>;
}

/** The long disclaimer that ends every results view (SPEC §12). */
export function ResultsDisclaimer() {
  return <p className="border-t border-divider pt-4 text-[13px] text-muted-foreground">{DISCLAIMER_LONG}</p>;
}

function ruleSummaryFor(r: EngineResult): string {
  return ruleCountSummary(r.triggeredRules.map((t) => ({ effectiveStatus: t.effectiveStatus, draft: !!getRule(t.ruleId)?.draft })));
}

const COST_TOPIC_LABELS: Record<CostEstimate["topic"], string> = { ...LEVER_PLAIN_NAMES, review: "People checking AI output" };

const isLever = (t: CostEstimate["topic"]): t is LeverKey => t !== "review";

function nextReviewLine(r: EngineResult): string {
  return `Next split review: ${formatIsoDate(r.operatingModel.nextReviewDate)} (${CADENCE_LABELS[r.operatingModel.splitReviewCadence]}).`;
}

function TierRationale({ r }: { r: EngineResult }) {
  return (
    <section aria-labelledby="tier-rationale" className="rounded-card border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h3 id="tier-rationale" className="text-base font-semibold text-ink">
          Why this tier
        </h3>
        <TierChip level={r.tier.level} />
      </div>
      <ul className="mt-3 list-disc space-y-1 pl-5 text-[15px] text-ink-2">
        {r.tier.rationale.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">
        Score {Math.round(r.tier.score * 10) / 10} of {r.tier.maxScore} ({Math.round(r.tier.pct)}%). Levels: I up to 25%, II up to
        50%, III up to 75%, IV above. An {TIER_LABEL}, not an official Algorithmic Impact Assessment.
      </p>
    </section>
  );
}

/** "What it costs you": case-specific estimates per lever (with what to keep in place), plus review time. */
function CostList({ r, headingId }: { r: EngineResult; headingId: string }) {
  const levers = new Map(r.operatingModel.levers.map((l) => [l.lever, l]));
  return (
    <section aria-labelledby={headingId} className="rounded-card bg-subtle p-5 sm:p-6">
      <h2 id={headingId} className="text-lg font-semibold text-ink">
        What it costs you
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        Each setting costs some time or speed now; the gain comes later, as people and the AI improve each other.
      </p>
      <dl className="mt-2 flex flex-col divide-y divide-divider">
        {r.operatingModel.costEstimates.map((c) => (
          <div key={c.topic} className="py-3">
            <dt className="flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-ink">
              {COST_TOPIC_LABELS[c.topic]}
              <span className="text-[13px] font-normal text-muted-foreground">Estimate</span>
            </dt>
            {isLever(c.topic) && (
              <dd className="mt-1 text-sm text-ink-2">
                <span className="font-medium text-ink">Direct cost:</span> {DIRECT_COST_PLAIN[c.topic]}
              </dd>
            )}
            <dd className="mt-1">
              <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
                {c.lines.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </dd>
            {isLever(c.topic) && levers.get(c.topic) && (
              <dd className="mt-1 text-[13px] text-muted-foreground">Keep in place: {levers.get(c.topic)?.guardrail}</dd>
            )}
          </div>
        ))}
      </dl>
      <p className="mt-2 text-[13px] text-muted-foreground">{COST_ESTIMATE_NOTE}</p>
      <ResearchBasis className="mt-3 bg-surface">
        <p>{TRADE_OFF_NOTE}</p>
        <ul className="list-disc space-y-1 pl-5">
          {r.operatingModel.levers.map((l) => (
            <li key={l.lever}>
              <span className="font-medium text-ink">{LEVER_NAMES[l.lever]}</span>: direct cost (thesis Table 4): {l.directCost}.
              Guardrail: {TABLE_4[l.lever].guardrail}.
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground">
          Table 4 costs, signals and warning signs are illustrative, not validated. The estimate lines are Splitline&apos;s own,
          not findings from the thesis.
        </p>
      </ResearchBasis>
    </section>
  );
}

function WhoDoesWhat({ r, decomposition }: { r: EngineResult; decomposition: ConfirmedDecomposition }) {
  const names = subtaskNames(decomposition);
  return (
    <section aria-labelledby="split-summary" className="rounded-card border border-border bg-surface p-5 sm:p-6">
      <h2 id="split-summary" className="text-lg font-semibold text-ink">
        Who does what
      </h2>
      <ul className="mt-3 flex flex-col gap-2 text-[15px]">
        {r.operatingModel.split.map((s) => (
          <li key={s.subtaskId} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
            <span className="font-medium text-ink sm:w-[45%] sm:shrink-0">{names.get(s.subtaskId) ?? s.subtaskId}</span>
            <span className="text-ink-2">{OWNER_LABELS[s.owner]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm text-muted-foreground">This is a starting split: it will move. {nextReviewLine(r)}</p>
    </section>
  );
}

export function SummaryPanel({
  r,
  reason,
  decomposition,
}: {
  r: EngineResult;
  reason: string;
  decomposition: ConfirmedDecomposition;
}) {
  const top = ruleCardsFor(r, r.verdict.topConditions);
  return (
    <Panel>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <VerdictCard
            verdict={r.verdict.verdict}
            tier={r.tier.level}
            reason={reason}
            ruleSummary={ruleSummaryFor(r)}
            topConditions={[]}
            costs={[]}
            primaryAction={
              <TabLinkButton tab="triage" className="mt-2 inline-flex min-h-6 items-center gap-1 text-sm font-medium text-brand underline underline-offset-2">
                Why this tier and every rule
              </TabLinkButton>
            }
            disclaimer={DISCLAIMER_LONG}
          />
          <section aria-labelledby="before-pilot" className="flex flex-col gap-3">
            <H2 id="before-pilot">Before you pilot</H2>
            {top.length > 0 ? (
              <>
                <p className="max-w-3xl text-[15px] text-ink-2">
                  These conditions likely apply. Open one to see why and what to consider.
                </p>
                <RuleCardList rules={top} defaultOpen={null} showPlanning />
                <p className="text-[13px] text-muted-foreground">{PLANNING_ESTIMATE_NOTE}</p>
              </>
            ) : (
              <p className="max-w-3xl text-[15px] text-ink-2">
                No rule here likely adds a condition before a pilot. The Triage tab lists good-practice items to consider.
              </p>
            )}
          </section>
          <WhoDoesWhat r={r} decomposition={decomposition} />
        </div>
        <aside aria-label="Costs and next steps" className="flex flex-col gap-6">
          <CostList r={r} headingId="costs" />
          <section aria-labelledby="next" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 sm:p-6">
            <h2 id="next" className="text-lg font-semibold text-ink">
              Next
            </h2>
            <p className="text-sm text-ink-2">{nextReviewLine(r)}</p>
            <OpenWhatIfButton className={buttonVariants({ size: "xl", className: "w-full" })}>Try a what-if</OpenWhatIfButton>
            <TabLinkButton tab="model" className={buttonVariants({ variant: "outline", size: "xl", className: "w-full" })}>
              See how your team runs it
            </TabLinkButton>
          </section>
        </aside>
      </div>
      <ResultsDisclaimer />
    </Panel>
  );
}

export function TriagePanel({ r }: { r: EngineResult }) {
  const rules = rulesBySeverity(r);
  return (
    <Panel>
      <TierRationale r={r} />
      <section aria-labelledby="rules" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <H2 id="rules">Rules that likely apply ({rules.length})</H2>
          <p className="text-sm text-muted-foreground">{ruleSummaryFor(r)}</p>
        </div>
        <p className="max-w-3xl text-[15px] text-ink-2">
          Each rule shows why it likely applies, what to consider, and its status. Proposed bills never change the verdict;
          regulator drafts can add conditions but never block.{" "}
          <Link href="/sources" className="font-medium text-brand underline underline-offset-2">
            See every rule on the Governance Map
          </Link>
          .
        </p>
        <RuleCardList rules={rules} defaultOpen={null} />
      </section>
      <ResultsDisclaimer />
    </Panel>
  );
}

const DRIFT_LABELS: Record<"augmentation_value" | "learning_loop", string> = {
  augmentation_value: "whether people do better work with the AI (augmentation value)",
  learning_loop: "whether corrections flow back into the AI (learning loop)",
};

export function OperatingModelPanel({ r, decomposition }: { r: EngineResult; decomposition: ConfirmedDecomposition }) {
  const om = r.operatingModel;
  const names = subtaskNames(decomposition);
  const costsFor = (topic: CostEstimate["topic"]) => om.costEstimates.find((c) => c.topic === topic);
  const review = costsFor("review");
  return (
    <Panel>
      <section aria-labelledby="split" className="flex flex-col gap-3">
        <H2 id="split">Who does each step</H2>
        <SplitMap
          rows={om.split.map((s) => ({ subtaskId: s.subtaskId, name: names.get(s.subtaskId) ?? s.subtaskId, owner: s.owner, reason: s.reason }))}
          startingSplitLabel="This is a starting split: it will move"
          reviewNote={`Re-check the split ${CADENCE_LABELS[om.splitReviewCadence]} · next review ${formatIsoDate(om.nextReviewDate)}`}
        />
        {review && (
          <div className="max-w-3xl rounded-control bg-subtle p-4">
            <h3 className="text-sm font-semibold text-ink">
              People checking AI output <span className="font-normal text-muted-foreground">(estimate)</span>
            </h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-ink-2">
              {review.lines.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
      <section aria-labelledby="levers" className="flex flex-col gap-3">
        <H2 id="levers">Three settings that make the split work</H2>
        <p className="max-w-3xl text-[15px] text-ink-2">{REINFORCEMENT_PLAIN}</p>
        <p className="max-w-3xl text-sm text-muted-foreground">
          {LEVER_INDICATORS_LABEL_PLAIN} {COST_ESTIMATE_NOTE}
        </p>
        <div className="grid gap-6 xl:grid-cols-3">
          {om.levers.map((l, i) => (
            <LeverCard key={l.lever} lever={l} index={i + 1} costs={costsFor(l.lever)} />
          ))}
        </div>
      </section>
      <section aria-labelledby="drift" className="flex flex-col gap-2">
        <H2 id="drift">Are your KPIs measuring the right things?</H2>
        {om.driftCheck.ok ? (
          <p className="text-[15px] text-ink-2">Your KPIs cover speed and volume, better work with the AI, and corrections flowing back.</p>
        ) : (
          <>
            <p className="max-w-3xl text-[15px] text-ink-2">
              Without a counterweight, work tends to drift toward automation because its returns are easier to measure. Your KPIs do
              not yet measure {om.driftCheck.missing.map((m) => DRIFT_LABELS[m]).join(" or ")}. Consider adding:
            </p>
            <ul className="list-disc pl-5 text-[15px] text-ink-2">
              {om.driftCheck.suggestedKpis.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </>
        )}
      </section>
      {om.scopeNotes.length > 0 && (
        <section aria-labelledby="scope-notes" className="flex flex-col gap-2">
          <H2 id="scope-notes">What changes for this case</H2>
          <ul className="list-disc pl-5 text-[15px] text-ink-2">
            {om.scopeNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}
      <section aria-label="About this model" className="flex max-w-3xl flex-col gap-3">
        <p className="rounded-card bg-subtle p-4 text-sm text-ink-2">{THESIS_SCOPE_NOTE_PLAIN}</p>
        <ResearchBasis label="Research basis for this tab">
          <p>
            <span className="font-semibold text-ink">Reinforcement.</span> {REINFORCEMENT_RESEARCH}
          </p>
          <p>
            <span className="font-semibold text-ink">Trade-off.</span> {TRADE_OFF_NOTE}
          </p>
          <p>
            <span className="font-semibold text-ink">Split labels.</span>{" "}
            {OWNERS.map((o) => `${OWNER_LABELS[o]} = ${OWNER_LABELS_RESEARCH[o]}`).join("; ")}. Moderator (P4): environmental
            dynamism sets the split review cadence.
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {SCOPE_NOTE_RESEARCH_REFS.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p>
            <span className="font-semibold text-ink">Scope.</span> {THESIS_SCOPE_DISCLOSURE}
          </p>
        </ResearchBasis>
      </section>
      <ResultsDisclaimer />
    </Panel>
  );
}

const KPI_KIND_LABELS: Record<KpiKind, string> = {
  efficiency: "Speed and volume",
  augmentation_value: "Better work with the AI",
  learning_loop: "Corrections flowing back",
};

export function RolloutPanel({ r }: { r: EngineResult }) {
  const plan = r.rollout;
  return (
    <Panel>
      <section aria-labelledby="phases" className="flex flex-col gap-3">
        <H2 id="phases">90-day rollout</H2>
        <ol className="grid gap-6 xl:grid-cols-3">
          {plan.phases.map((p) => (
            <li key={p.id} className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 sm:p-6">
              <div>
                <p className="font-mono text-xs font-medium tracking-[0.04em] text-brand uppercase">{p.days}</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">{p.title}</h3>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-ink">Deliverables</h4>
                <ul className="mt-1 flex flex-col gap-2.5 text-[15px] text-ink-2">
                  {p.deliverables.map((d) => (
                    <li key={d.text}>
                      {d.text}
                      <span className="block text-[13px] text-muted-foreground">Likely owner: {d.ownerRole}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-ink">KPIs</h4>
                <ul className="mt-1 list-disc pl-5 text-[15px] text-ink-2">
                  {p.kpis.map((k) => (
                    <li key={k}>{k}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-ink">Gate to the next phase</h4>
                <ul className="mt-1 list-disc pl-5 text-[15px] text-ink-2">
                  {p.gateCriteria.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ol>
        <p className="text-[13px] text-muted-foreground">{PLANNING_ESTIMATE_NOTE}</p>
      </section>
      <section aria-labelledby="kpis" className="flex flex-col gap-3">
        <H2 id="kpis">KPI set</H2>
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full min-w-[480px] text-left text-[15px]">
            <caption className="sr-only">
              KPI set: one for speed and volume, one for better work with the AI, one for corrections flowing back
            </caption>
            <thead className="bg-subtle text-[13px] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">What it measures</th>
                <th scope="col" className="px-4 py-3 font-medium">KPI</th>
                <th scope="col" className="px-4 py-3 font-medium">From</th>
              </tr>
            </thead>
            <tbody>
              {plan.kpis.map((k) => (
                <tr key={k.kind} className="border-t border-divider">
                  <th scope="row" className="px-4 py-3 font-medium text-ink">{KPI_KIND_LABELS[k.kind]}</th>
                  <td className="px-4 py-3 text-ink-2">{k.name}</td>
                  <td className="px-4 py-3 text-ink-2">{k.fromUser ? "Your KPIs" : "Suggested by Splitline"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section aria-labelledby="monitoring" className="flex flex-col gap-3">
        <H2 id="monitoring">Monitoring plan</H2>
        <p className="text-sm text-muted-foreground">{LEVER_INDICATORS_LABEL_PLAIN}</p>
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full min-w-[560px] text-left text-[15px]">
            <caption className="sr-only">Monitoring signal and warning sign per setting</caption>
            <thead className="bg-subtle text-[13px] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Setting</th>
                <th scope="col" className="px-4 py-3 font-medium">Monitor</th>
                <th scope="col" className="px-4 py-3 font-medium">Warn if</th>
              </tr>
            </thead>
            <tbody>
              {plan.monitoringPlan.map((m) => (
                <tr key={m.lever} className="border-t border-divider align-top">
                  <th scope="row" className="px-4 py-3 font-medium text-ink">{LEVER_PLAIN_NAMES[m.lever]}</th>
                  <td className="px-4 py-3 text-ink-2">{m.monitoringIndicator}</td>
                  <td className="px-4 py-3 text-ink-2">{m.warningIndicator}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <ResultsDisclaimer />
    </Panel>
  );
}

export function ExportPanel({ r, record }: { r: EngineResult; record: InventoryRecord }) {
  return (
    <Panel>
      <section aria-labelledby="charter" className="flex flex-col gap-3">
        <H2 id="charter">One-page charter</H2>
        <p className="max-w-3xl text-[15px] text-ink-2">
          The charter puts the verdict, the {TIER_LABEL}, the conditions with likely owners, who does what, the three settings
          with what to keep in place and what they cost, the 90-day plan, the KPIs, and every triggered rule with its status,
          source and verification date on one printable page.
        </p>
        <ul className="list-disc pl-5 text-[15px] text-ink-2">
          <li>{r.verdict.topConditions.length} top conditions</li>
          <li>{r.triggeredRules.length} triggered rules</li>
          <li>{r.operatingModel.split.length} steps in the starting split</li>
        </ul>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" disabled className={buttonVariants({ variant: "outline" })}>
            Download charter (Markdown)
          </button>
          <button type="button" disabled className={buttonVariants({ variant: "outline" })}>
            Download inventory record (JSON)
          </button>
          <p className="text-sm text-muted-foreground">Downloads arrive with live runs.</p>
        </div>
      </section>
      <section aria-labelledby="inventory" className="flex flex-col gap-3">
        <H2 id="inventory">Inventory record preview</H2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          An ISO/IEC 42001-style inventory entry. Structured fields only; the free-text description is never included.
        </p>
        <pre tabIndex={0} aria-label="Inventory record JSON" className="overflow-x-auto rounded-card border border-border bg-subtle p-4 font-mono text-[13px] text-ink">
          {JSON.stringify(record, null, 2)}
        </pre>
      </section>
      <Link href="/" className="inline-flex min-h-6 w-fit items-center gap-1 text-[15px] font-medium text-brand">
        Back to all presets <ArrowRightIcon aria-hidden className="size-4" />
      </Link>
      <ResultsDisclaimer />
    </Panel>
  );
}
