import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatIsoDate } from "@/components/splitline/format";
import { computePreset, inventoryRecord, PRESET_AS_OF } from "@/components/workspace/model";
import { ExportPanel, OperatingModelPanel, RolloutPanel, SummaryPanel, TriagePanel } from "@/components/workspace/panels";
import { WhatIfPanel } from "@/components/workspace/what-if-panel";
import { WorkspaceTabs } from "@/components/workspace/workspace-tabs";
import { getPreset, PRESETS } from "@/content/presets";
import { valueLabel } from "@/engine/labels";

export function generateStaticParams() {
  return PRESETS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/preset/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const preset = getPreset(slug);
  return preset
    ? { title: preset.intake.title, description: `Preset: ${preset.organization}. Indicative triage and operating model.` }
    : {};
}

/**
 * Preset workspace (SPEC §4): same tabs as a live case, computed at build time from committed JSON.
 * `params` is read inside Suspense (Cache Components); every known slug is prerendered in full, and
 * `src/proxy.ts` gives unknown slugs a real 404.
 */
export default function PresetPage({ params }: PageProps<"/preset/[slug]">) {
  return (
    <main id="main" className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 pt-8 pb-24 sm:px-10 md:pb-8 lg:px-20">
      <Suspense fallback={<p className="text-[15px] text-muted-foreground">Loading the preset…</p>}>
        <PresetWorkspace params={params} />
      </Suspense>
    </main>
  );
}

async function PresetWorkspace({ params }: { params: PageProps<"/preset/[slug]">["params"] }) {
  const { slug } = await params;
  const preset = getPreset(slug);
  if (!preset) notFound();
  const r = computePreset(preset);
  const record = inventoryRecord(`preset-${preset.slug}`, preset.intake, r, PRESET_AS_OF);
  const orgLabel = valueLabel(preset.intake.orgType);

  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="font-mono text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase">
          {orgLabel} · {preset.organization}
        </p>
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[36px]">{preset.intake.title}</h1>
        <p className="text-sm text-muted-foreground">
          Preset with fictional data · results as of {formatIsoDate(PRESET_AS_OF)} · no API calls
        </p>
      </header>
      <WorkspaceTabs
        panels={{
          summary: <SummaryPanel r={r} reason={preset.verdictExplanation} decomposition={preset.decomposition} />,
          triage: <TriagePanel r={r} />,
          model: <OperatingModelPanel r={r} decomposition={preset.decomposition} />,
          rollout: <RolloutPanel r={r} />,
          export: <ExportPanel r={r} record={record} />,
        }}
      />
      <WhatIfPanel
        intake={preset.intake}
        decomposition={preset.decomposition}
        dynamism={r.facts.dynamism}
        today={PRESET_AS_OF}
        base={{
          verdict: r.verdict.verdict,
          tier: r.tier.level,
          rulesCount: r.triggeredRules.length,
          blockersCount: r.triggeredRules.filter((t) => t.severity === "blocker").length,
        }}
      />
    </>
  );
}
