import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CharterView } from "@/components/export/charter-view";
import { PrintButton } from "@/components/export/print-button";
import { formatIsoDate } from "@/components/splitline/format";
import { computePreset, PRESET_AS_OF } from "@/components/workspace/model";
import { getPreset, PRESETS } from "@/content/presets";
import { getRecordedNarrative } from "@/content/presets/narratives";
import { charterModel } from "@/export/charter";
import { siteUrl } from "@/lib/site";

/**
 * Print page: every slug is prerendered from `generateStaticParams`, and the whole charter must be in
 * the static HTML for printing, so it reads `params` at page level (as the preset workspace does,
 * ADR-0018 §8) and opts out of the dev-only instant-navigation check.
 */
export const instant = false;

export function generateStaticParams() {
  return PRESETS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/preset/[slug]/charter">): Promise<Metadata> {
  const { slug } = await params;
  const preset = getPreset(slug);
  return preset ? { title: `Charter: ${preset.intake.title}`, robots: { index: false } } : {};
}

/** Printable one-page charter for a preset (SPEC §11). Static, like the preset workspace. */
export default async function PresetCharterPage({ params }: PageProps<"/preset/[slug]/charter">) {
  const { slug } = await params;
  const preset = getPreset(slug);
  if (!preset) notFound();
  const m = charterModel({
    title: preset.intake.title,
    asOf: PRESET_AS_OF,
    result: computePreset(preset),
    decomposition: preset.decomposition,
    reason: preset.verdictExplanation,
    narrative: getRecordedNarrative(preset.slug, formatIsoDate),
    url: `${siteUrl()}/preset/${preset.slug}`,
  });
  return (
    <main id="main" className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-6 px-4 pt-8 pb-16 sm:px-10 lg:px-20 print:p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/preset/${preset.slug}?tab=export`} className="min-h-6 text-[15px] font-medium text-brand underline underline-offset-2">
          Back to the workspace
        </Link>
        <PrintButton />
      </div>
      <CharterView m={m} />
    </main>
  );
}
