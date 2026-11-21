/**
 * Workspace tab panels (server components). Everything shown comes from the engine result; copy
 * constants come from the engine so thesis and legal wording stay in one place.
 */
import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatIsoDate } from "@/components/splitline/format";
import { LeverCard } from "@/components/splitline/lever-card";
import { RuleCardList } from "@/components/splitline/rule-card";
import { SplitMap } from "@/components/splitline/split-map";
import { splitSummary } from "@/components/splitline/split-map.logic";
import { StatusBadge } from "@/components/splitline/status-badge";
import { ruleCountSummary } from "@/components/splitline/status-badge.logic";
import { TierChip, VerdictCard } from "@/components/splitline/verdict-card";
import { buttonVariants } from "@/components/ui/button";
import { getRule } from "@/content/rules";
import { DISCLAIMER_LONG, type EngineResult } from "@/engine";
import { CADENCE_LABELS } from "@/engine/cadence";
import { LEVER_INDICATORS_LABEL, LEVER_NAMES, THESIS_SCOPE_DISCLOSURE, TRADE_OFF_NOTE } from "@/engine/levers";
import { STARTING_SPLIT_LABEL } from "@/engine/split";
import { TIER_LABEL } from "@/engine/tier";
import type { ConfirmedDecomposition, DeliverableSource, KpiKind } from "@/engine/types";
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

function TierRationale({ r, compact = false }: { r: EngineResult; compact?: boolean }) {
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
      {!compact && (
        <p className="mt-3 text-sm text-muted-foreground">
          Score {Math.round(r.tier.score * 10) / 10} of {r.tier.maxScore} ({Math.round(r.tier.pct)}%). Levels: I up to 25%, II up to
          50%, III up to 75%, IV above. An {TIER_LABEL}, not an official Algorithmic Impact Assessment.
        </p>
      )}
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
  const names = subtaskNames(decomposition);
  const costs = r.operatingModel.levers.map((l) => ({ label: LEVER_NAMES[l.lever], text: l.directCost, guardrail: l.guardrail }));
  return (
    <Panel>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-6">
          <VerdictCard
            verdict={r.verdict.verdict}
            tier={r.tier.level}
            reason={reason}
            ruleSummary={ruleSummaryFor(r)}
            topConditions={top.map((c) => ({ id: c.ruleId, title: c.title, badge: <StatusBadge model={c.badge} size="inline" /> }))}
            costs={[]}
            disclaimer={DISCLAIMER_LONG}
          />
          {top.length > 0 && (
            <section aria-labelledby="top-conditions" className="flex flex-col gap-3">
              <H2 id="top-conditions">Top conditions in detail</H2>
              <RuleCardList rules={top} />
            </section>
          )}
          <TierRationale r={r} compact />
          <section aria-labelledby="split-summary" className="rounded-card border border-border bg-surface p-5 sm:p-6">
            <h3 id="split-summary" className="text-base font-semibold text-ink">
              Starting split
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">{splitSummary(r.operatingModel.split.map((s) => s.owner))}</p>
            <ul className="mt-3 flex flex-col gap-1 text-[15px] text-ink-2">
              {r.operatingModel.split.map((s) => (
                <li key={s.subtaskId}>
                  <span className="font-medium text-ink">{names.get(s.subtaskId) ?? s.subtaskId}</span>:{" "}
                  {s.owner === "machine" ? "Machine" : s.owner === "machine_review" ? "Machine + review" : "Human"}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-muted-foreground">
              {STARTING_SPLIT_LABEL}. Next split review {formatIsoDate(r.operatingModel.nextReviewDate)} (
              {CADENCE_LABELS[r.operatingModel.splitReviewCadence]}).
            </p>
          </section>
        </div>
        <aside aria-label="Costs and next steps" className="flex flex-col gap-6">
          <section aria-labelledby="costs" className="rounded-card bg-subtle p-5 sm:p-6">
            <h2 id="costs" className="text-lg font-semibold text-ink">
              What this design costs
            </h2>
            <p className="mt-1 text-sm text-ink-2">{TRADE_OFF_NOTE.replace(/^What this design costs: e/, "E")}</p>
            <dl className="mt-2 flex flex-col divide-y divide-divider">
              {costs.map((c) => (
                <div key={c.label} className="py-3">
                  <dt className="text-sm font-semibold text-ink">{c.label}</dt>
                  <dd className="mt-0.5 text-sm text-ink-2">{c.text}</dd>
                  <dd className="mt-0.5 text-[13px] text-muted-foreground">Guardrail: {c.guardrail}</dd>
                </div>
              ))}
            </dl>
          </section>
          <section aria-labelledby="next" className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5 sm:p-6">
            <h2 id="next" className="text-lg font-semibold text-ink">
              Next
            </h2>
            <OpenWhatIfButton className={buttonVariants({ size: "xl", className: "w-full" })}>Try a what-if</OpenWhatIfButton>
            <TabLinkButton tab="model" className={buttonVariants({ variant: "outline", size: "xl", className: "w-full" })}>
              Design the operating model
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
  augmentation_value: "augmentation value",
  learning_loop: "learning loop",
};

export function OperatingModelPanel({ r, decomposition }: { r: EngineResult; decomposition: ConfirmedDecomposition }) {
  const om = r.operatingModel;
  const names = subtaskNames(decomposition);
  return (
    <Panel>
      <p className="max-w-3xl rounded-card bg-subtle p-4 text-sm text-ink-2">{THESIS_SCOPE_DISCLOSURE}</p>
      <section aria-labelledby="split" className="flex flex-col gap-3">
        <H2 id="split">Split Map</H2>
        <SplitMap
          rows={om.split.map((s) => ({ subtaskId: s.subtaskId, name: names.get(s.subtaskId) ?? s.subtaskId, owner: s.owner, reason: s.reason }))}
          startingSplitLabel={STARTING_SPLIT_LABEL}
          reviewNote={`Split review ${CADENCE_LABELS[om.splitReviewCadence]} · next review ${formatIsoDate(om.nextReviewDate)}`}
        />
      </section>
      <section aria-labelledby="levers" className="flex flex-col gap-3">
        <H2 id="levers">Three levers, each with its guardrail</H2>
        <p className="max-w-3xl text-[15px] text-ink-2">{TRADE_OFF_NOTE}</p>
        <p className="max-w-3xl text-sm text-muted-foreground">{LEVER_INDICATORS_LABEL}</p>
        <div className="grid gap-6 xl:grid-cols-3">
          {om.levers.map((l, i) => (
            <LeverCard key={l.lever} lever={l} index={i + 1} />
          ))}
        </div>
      </section>
      <section aria-labelledby="drift" className="flex flex-col gap-2">
        <H2 id="drift">Drift check on your KPIs</H2>
        {om.driftCheck.ok ? (
          <p className="text-[15px] text-ink-2">Your KPIs cover efficiency, augmentation value and the learning loop.</p>
        ) : (
          <>
            <p className="text-[15px] text-ink-2">
              Without a counterweight, work tends to drift toward automation because its returns are easier to measure. Your KPIs
              miss: {om.driftCheck.missing.map((m) => DRIFT_LABELS[m]).join(" and ")}. Consider adding:
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
          <H2 id="scope-notes">Scope notes</H2>
          <ul className="list-disc pl-5 text-[15px] text-ink-2">
            {om.scopeNotes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}
      <ResultsDisclaimer />
    </Panel>
  );
}

const KPI_KIND_LABELS: Record<KpiKind, string> = {
  efficiency: "Efficiency",
  augmentation_value: "Augmentation value",
  learning_loop: "Learning loop",
};

function sourceLabel(s: DeliverableSource): string {
  if (s.kind === "rule") return s.ruleId;
  if (s.kind === "lever") return LEVER_NAMES[s.lever];
  return "Operating model";
}

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
                <p className="font-mono text-xs font-medium tracking-[0.04em] text-brand uppercase">Days {p.days}</p>
                <h3 className="mt-1 text-lg font-semibold text-ink">{p.title}</h3>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-ink">Deliverables</h4>
                <ul className="mt-1 flex flex-col gap-1.5 text-[15px] text-ink-2">
                  {p.deliverables.map((d) => (
                    <li key={d.text}>
                      {d.text} <span className="text-[13px] text-muted-foreground">({sourceLabel(d.source)})</span>
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
      </section>
      <section aria-labelledby="kpis" className="flex flex-col gap-3">
        <H2 id="kpis">KPI set</H2>
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full min-w-[480px] text-left text-[15px]">
            <caption className="sr-only">KPI set: one efficiency, one augmentation-value and one learning-loop KPI</caption>
            <thead className="bg-subtle text-[13px] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Kind</th>
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
        <p className="text-sm text-muted-foreground">{LEVER_INDICATORS_LABEL}</p>
        <div className="overflow-x-auto rounded-card border border-border">
          <table className="w-full min-w-[560px] text-left text-[15px]">
            <caption className="sr-only">Monitoring signal and warning sign per lever</caption>
            <thead className="bg-subtle text-[13px] text-muted-foreground">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Lever</th>
                <th scope="col" className="px-4 py-3 font-medium">Monitor</th>
                <th scope="col" className="px-4 py-3 font-medium">Warn if</th>
              </tr>
            </thead>
            <tbody>
              {plan.monitoringPlan.map((m) => (
                <tr key={m.lever} className="border-t border-divider align-top">
                  <th scope="row" className="px-4 py-3 font-medium text-ink">{LEVER_NAMES[m.lever]}</th>
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
          The charter puts the verdict, the {TIER_LABEL}, the top conditions, the starting split, the three levers with their
          guardrails and costs, the 90-day plan, the KPIs, and every triggered rule with its status, source and verification date
          on one printable page.
        </p>
        <ul className="list-disc pl-5 text-[15px] text-ink-2">
          <li>{r.verdict.topConditions.length} top conditions</li>
          <li>{r.triggeredRules.length} triggered rules</li>
          <li>{r.operatingModel.split.length} subtasks in the starting split</li>
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
