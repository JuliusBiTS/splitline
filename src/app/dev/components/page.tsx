import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Logo } from "@/components/splitline/chrome";
import { DivergingScoreBars } from "@/components/splitline/diverging-score-bar";
import { formatIsoDate } from "@/components/splitline/format";
import { LeverCard } from "@/components/splitline/lever-card";
import { QuadrantChart } from "@/components/splitline/quadrant-chart";
import { ReviewPanel } from "@/components/splitline/review-panel";
import { RuleCardList } from "@/components/splitline/rule-card";
import { ruleCardModel } from "@/components/splitline/rule-card.logic";
import { pulseScoreRows } from "@/components/splitline/scores.logic";
import { SplitEditor } from "@/components/splitline/split-editor";
import { SplitMap } from "@/components/splitline/split-map";
import { StatusBadge } from "@/components/splitline/status-badge";
import { ruleCountSummary, type StatusKind } from "@/components/splitline/status-badge.logic";
import { Stepper } from "@/components/splitline/steps";
import { TierChip, VerdictCard, VerdictChip } from "@/components/splitline/verdict-card";
import { diffChips } from "@/components/splitline/what-if.logic";
import { getPreset } from "@/content/presets";
import { getRule } from "@/content/rules";
import { Button } from "@/components/ui/button";
import { computeCase, DISCLAIMER_LONG } from "@/engine";
import { LEVER_INDICATORS_LABEL, LEVER_NAMES, TRADE_OFF_NOTE } from "@/engine/levers";
import { PULSE_FOOTNOTE, PULSE_SHORT_LABEL, scorePulse } from "@/engine/pulse";
import { STARTING_SPLIT_LABEL } from "@/engine/split";
import type { EngineResult } from "@/engine";
import type { WhatIfToggles } from "@/engine/types";
import { computeWhatIf } from "@/engine/whatif";
import { PrimitivesDemo, ProgressDemo, WhatIfDemo, type WhatIfScenario } from "./demos";

export const metadata: Metadata = {
  title: "Components · Splitline",
  robots: { index: false, follow: false },
};

/** Fixed "today" so the specimens are reproducible (engine needs an injected date). */
const TODAY = "2026-11-20";

const STATUS_SPECIMENS: { kind: StatusKind; label: string; statusLabel?: string }[] = [
  { kind: "applies", label: "Applies" },
  { kind: "applies_future", label: "Applies from January 1, 2027" },
  { kind: "mandatory", label: "Mandatory for federal institutions" },
  { kind: "regulator", label: "Regulator expects" },
  { kind: "regulator_draft", label: "Regulator draft (consultation until February 15, 2027)" },
  { kind: "prepare", label: "Prepare for (proposed)" },
  { kind: "good", label: "Good practice" },
  { kind: "reference", label: "Reference framework" },
  { kind: "blocker", label: "Blocker", statusLabel: "Regulator expects" },
];

function Section({ id, title, note, children }: { id: string; title: string; note?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4 border-t border-divider pt-8">
      <div>
        <h2 id={id} className="text-xl font-semibold text-ink">
          {title}
        </h2>
        {note && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}

function scenario(r: EngineResult, chips: WhatIfScenario["chips"]): WhatIfScenario {
  return {
    verdict: r.verdict.verdict,
    tier: r.tier.level,
    rulesCount: r.triggeredRules.length,
    blockersCount: r.triggeredRules.filter((t) => t.severity === "blocker").length,
    chips,
  };
}

export default function ComponentsPage() {
  const hiring = getPreset("hiring-and-sentiment")!;
  const claims = getPreset("claims-document-intake")!;
  const h = computeCase(hiring.intake, hiring.decomposition, { today: TODAY });
  const c = computeCase(claims.intake, claims.decomposition, { today: TODAY });

  const ruleCards = h.verdict.topConditions.flatMap((id) => {
    const t = h.triggeredRules.find((x) => x.ruleId === id);
    const meta = getRule(id);
    return t && meta ? [ruleCardModel(t, meta)] : [];
  });

  const subtaskById = new Map(claims.decomposition.subtasks.map((s) => [s.id, s]));
  const splitRows = c.operatingModel.split.map((s) => ({
    subtaskId: s.subtaskId,
    name: subtaskById.get(s.subtaskId)?.name ?? s.subtaskId,
    owner: s.owner,
    reason: s.reason,
  }));
  const editorRows = claims.decomposition.subtasks.map((s) => {
    const owner = c.operatingModel.split.find((x) => x.subtaskId === s.id)?.owner ?? "machine_review";
    return {
      subtaskId: s.id,
      name: s.name,
      judgment: s.judgmentIntensity,
      errorCost: s.errorCost,
      volume: s.volume,
      proposedOwner: owner,
      reason: s.rationale,
    };
  });

  // What-if: the engine computes every toggle combination for the claims preset.
  const toggleDefs: { id: string; label: string; toggles: WhatIfToggles }[] = [
    { id: "us", label: "Process with a US or global API", toggles: { hosting: "us_or_global_api" } },
    { id: "crisis", label: "Crisis context (temporary centralization)", toggles: { crisisContext: true } },
  ];
  const scenarios: Record<string, WhatIfScenario> = { "": scenario(c, []) };
  const combos = [["us"], ["crisis"], ["crisis", "us"]];
  for (const combo of combos) {
    const toggles = Object.assign({}, ...toggleDefs.filter((t) => combo.includes(t.id)).map((t) => t.toggles)) as WhatIfToggles;
    const w = computeWhatIf(c, claims.intake, claims.decomposition, toggles, { today: TODAY });
    scenarios[combo.join("+")] = scenario(w.result, diffChips(w.diff));
  }

  // Pulse: two synthetic episodes (illustrative, not validated).
  const ep1 = scorePulse({ role: "lead", A1: 5, A2: 4, A3: 4, B1: 3, B2: 4, B3: 3, D1: 4, D2: 3, D3: 3 });
  const ep2 = scorePulse({ role: "lead", A1: 6, A2: 5, A3: 6, B1: 5, B2: 4, B3: 5, D1: 5, D2: 4, D3: 5 });

  return (
    <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-10 px-5 py-8 sm:px-10 lg:px-20">
      <header className="flex flex-col gap-3">
        <Logo />
        <h1 className="text-[34px] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[44px]">Components</h1>
        <p className="max-w-3xl text-[17px] text-muted-foreground">
          Specimens of the Splitline component library on the Claude Design tokens (ADR-0005). Data comes from the engine
          run on the fictional presets ({hiring.organization}; {claims.organization}). Developer page, not indexed.
        </p>
      </header>

      <Section id="tokens" title="Tokens" note="Accent Evergreen, slate neutrals, status pairs, diverging scores.">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[
            ["Accent", "bg-brand"],
            ["Accent hover", "bg-brand-hover"],
            ["Accent tint", "bg-brand-tint"],
            ["Ink", "bg-ink"],
            ["Secondary", "bg-muted-foreground"],
            ["Faint", "bg-faint"],
            ["Border", "bg-border"],
            ["Subtle", "bg-subtle"],
            ["Score +", "bg-score-pos"],
            ["Score −", "bg-score-neg"],
            ["Track", "bg-score-track"],
            ["Chip", "bg-chip"],
          ].map(([name, cls]) => (
            <li key={name} className="flex flex-col gap-1.5">
              <span className={`h-12 rounded-control border border-divider ${cls}`} />
              <span className="text-[13px] text-ink-2">{name}</span>
            </li>
          ))}
        </ul>
        <p className="font-mono text-sm text-ink-2">IBM Plex Mono · STP 62% · Automation error 4% · +0.42 −0.15</p>
      </Section>

      <Section id="primitives" title="Primitives" note="shadcn/ui on Base UI, restyled with tokens: Button, Tabs, Select, Switch, Tooltip, Sonner.">
        <PrimitivesDemo />
      </Section>

      <Section id="status-badge" title="StatusBadge" note="Icon + label, never colour alone. Labels follow SPEC §7.1.">
        <ul className="flex flex-wrap gap-3">
          {STATUS_SPECIMENS.map((s) => (
            <li key={s.kind}>
              <StatusBadge model={s} />
            </li>
          ))}
        </ul>
      </Section>

      <Section id="verdict-card" title="VerdictCard" note="Confidence wording is sample copy; the engine does not compute it yet.">
        <div className="flex flex-wrap items-center gap-3">
          <VerdictChip verdict="go" />
          <VerdictChip verdict="go_with_conditions" />
          <VerdictChip verdict="redesign" />
          <VerdictChip verdict="stop" />
          <TierChip level="II" />
        </div>
        <VerdictCard
          verdict={h.verdict.verdict}
          tier={h.tier.level}
          reason={hiring.verdictExplanation}
          confidence="moderate"
          confidenceNote="Sample copy for the specimen"
          ruleSummary={ruleCountSummary(
            h.triggeredRules.map((t) => ({ effectiveStatus: t.effectiveStatus, draft: !!getRule(t.ruleId)?.draft })),
          )}
          topConditions={ruleCards.map((r) => ({
            id: r.ruleId,
            title: r.title,
            badge: <StatusBadge model={r.badge} size="inline" />,
          }))}
          costs={h.operatingModel.levers.map((l) => ({ label: LEVER_NAMES[l.lever], text: l.directCost }))}
          primaryAction={<Button>Export charter</Button>}
          disclaimer={DISCLAIMER_LONG}
          className="max-w-3xl"
        />
      </Section>

      <Section id="rule-card" title="RuleCard" note={`Top conditions for ${hiring.organization}. First card open.`}>
        <div className="max-w-4xl">
          <RuleCardList rules={ruleCards} />
        </div>
      </Section>

      <Section id="split-map" title="SplitMap" note={`Read view and edit view (Intake step 3) for ${claims.organization}.`}>
        <SplitMap
          rows={splitRows}
          startingSplitLabel={STARTING_SPLIT_LABEL}
          reviewNote={`Recorded in the shared split register · next review ${formatIsoDate(c.operatingModel.nextReviewDate)}`}
        />
        <Stepper steps={["Describe", "Break down", "Confirm the split"]} current={2} />
        <SplitEditor rows={editorRows} />
      </Section>

      <Section id="lever-card" title="LeverCard" note={LEVER_INDICATORS_LABEL}>
        <p className="max-w-3xl text-[15px] text-ink-2">{TRADE_OFF_NOTE}</p>
        <div className="grid gap-6 lg:grid-cols-3">
          {c.operatingModel.levers.map((l, i) => (
            <LeverCard key={l.lever} lever={l} index={i + 1} />
          ))}
        </div>
      </Section>

      <Section id="scores" title="DivergingScoreBar and QuadrantChart" note={`${PULSE_FOOTNOTE} Synthetic episodes.`}>
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <QuadrantChart
            title={`Reinforcement Pulse, episodes 1–2 (${PULSE_SHORT_LABEL})`}
            points={[
              { label: "Ep 1", a: ep1.a, b: ep1.b },
              { label: "Ep 2", a: ep2.a, b: ep2.b },
            ]}
          />
          <DivergingScoreBars
            rows={pulseScoreRows(ep2)}
            caption={`Reinforcement Pulse · Episode 2 of 2 · ${PULSE_SHORT_LABEL} · ${ep2.labels.perspective}`}
            className="max-w-xl"
          />
        </div>
        <ul className="flex max-w-3xl list-disc flex-col gap-1 pl-5 text-sm text-ink-2">
          <li>{ep2.labels.roleNote}</li>
          <li>{ep2.labels.scopeDisclosure}</li>
        </ul>
      </Section>

      <Section id="what-if" title="WhatIfDrawer" note={`Toggles recompute ${claims.organization} through the engine.`}>
        <WhatIfDemo toggleDefs={toggleDefs.map(({ id, label }) => ({ id, label }))} scenarios={scenarios} />
      </Section>

      <Section id="review-panel" title="ReviewPanel" note="Living Lab review. Focus inside the panel, then use A, C, E, 1–5, J, K.">
        <ReviewPanel
          merchant="Coastline Physiotherapy (fictional)"
          lines={[
            { label: "Initial assessment", cents: 9500 },
            { label: "Treatment 1", cents: 8500 },
            { label: "Treatment 2", cents: 8500 },
            { label: "Exercise band", cents: 1200 },
          ]}
          totalCents={28900}
          fields={[
            { id: "provider", label: "Provider", value: "Coastline Physiotherapy", confidence: "High" },
            { id: "date", label: "Service date", value: "2026-10-14", confidence: "Medium" },
          ]}
        />
      </Section>

      <Section id="progress" title="ProgressNarration" note="Named steps instead of a spinner; announced politely.">
        <ProgressDemo />
      </Section>
    </main>
  );
}
