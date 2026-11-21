import { ArrowRightIcon } from "lucide-react";
import Link from "next/link";
import { TierChip, VerdictChip } from "@/components/splitline/verdict-card";
import { buttonVariants } from "@/components/ui/button";
import { computePreset } from "@/components/workspace/model";
import { PRESETS } from "@/content/presets";
import { valueLabel } from "@/engine/labels";

const HOW_IT_WORKS = [
  {
    title: "Triage",
    text: "Indicative governance triage against Canadian and BC rules. Each rule carries its status (in force, future-dated, proposed, regulator guidance, government policy, good practice or reference), with its source and the date it was last verified.",
  },
  {
    title: "Design the split",
    text: "Decide who sets the human–AI split, how it is reviewed, how the teams exchange learning, and what that design costs.",
  },
  {
    title: "Measure",
    text: "After launch, the Reinforcement Pulse and the Living Lab (both illustrative, not validated) show whether automation and augmentation are feeding each other, or whether one direction lags and caps the reinforcement.",
  },
];

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export default function Home() {
  const cards = PRESETS.map((p) => {
    const r = computePreset(p);
    return { preset: p, verdict: r.verdict.verdict, tier: r.tier.level };
  });
  return (
    <main id="main" className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-12 px-4 py-12 sm:px-10 sm:py-20 lg:px-20">
        <section aria-labelledby="hero-title" className="flex max-w-3xl flex-col gap-5">
          <p className="text-sm font-medium text-brand">For AI enablement and transformation leads in Canada</p>
          <h1 id="hero-title" className="text-[36px] leading-[1.08] font-semibold tracking-[-0.025em] text-ink sm:text-[56px]">
            Design where the machine ends and judgment begins.
          </h1>
          <p className="text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Turn an AI idea into a governed human–AI operating model in about 15 minutes, then measure whether it is working.
          </p>
        </section>

        <section aria-labelledby="presets-title" className="flex flex-col gap-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="presets-title" className="text-xl font-semibold text-ink">
              Start from a worked case
            </h2>
            <p className="text-sm text-muted-foreground">Each preset opens with full results. No sign-in, no API call.</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ preset, verdict, tier }) => (
              <li key={preset.slug}>
                <article className="relative flex h-full flex-col gap-4 rounded-card border border-border bg-surface p-6 transition-shadow focus-within:shadow-elevated hover:shadow-elevated">
                  <p className="font-mono text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase">
                    {capitalize(valueLabel(preset.intake.orgType))}
                  </p>
                  <h3 className="text-lg leading-snug font-semibold text-ink">
                    <Link href={`/preset/${preset.slug}`} className="after:absolute after:inset-0 after:content-['']">
                      {preset.intake.title}
                    </Link>
                  </h3>
                  <p className="text-sm text-muted-foreground">{preset.organization}</p>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <VerdictChip verdict={verdict} />
                    <TierChip level={tier} />
                  </div>
                  <p aria-hidden className="flex items-center gap-1 border-t border-divider pt-4 text-[15px] font-medium text-brand">
                    Open preset <ArrowRightIcon className="size-4" />
                  </p>
                </article>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-4 rounded-card border border-dashed border-border-strong p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">Start your own</h2>
              <p className="mt-1 text-[15px] text-muted-foreground">
                Describe a use case in plain words. You confirm every step before anything is analyzed.
              </p>
            </div>
            <Link href="/case/new" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Describe a use case
            </Link>
          </div>
        </section>
      </div>

      <section aria-labelledby="how-title" className="bg-subtle">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-12 sm:px-10 sm:py-16 lg:px-20">
          <h2 id="how-title" className="text-2xl font-semibold text-ink">
            How it works
          </h2>
          <ol className="grid gap-8 md:grid-cols-3">
            {HOW_IT_WORKS.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-2 border-t-2 border-brand pt-5">
                <span aria-hidden className="font-mono text-sm text-brand">
                  0{i + 1}
                </span>
                <h3 className="text-lg font-semibold text-ink">{s.title}</h3>
                <p className="text-[15px] leading-relaxed text-ink-2">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </main>
  );
}
