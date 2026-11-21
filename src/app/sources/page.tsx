import { ExternalLinkIcon } from "lucide-react";
import type { Metadata } from "next";
import { formatIsoDate } from "@/components/splitline/format";
import { StatusBadge } from "@/components/splitline/status-badge";
import { catalogueStatus } from "@/components/splitline/status-badge.logic";
import { RULE_CATALOGUE, RULE_CATALOGUE_VERSION } from "@/content/rules";
import type { RuleMeta } from "@/engine/types";

export const metadata: Metadata = {
  title: "Governance Map",
  description: "Every Canadian and BC rule Splitline checks, with its status, source and last-verified date.",
};

const JURISDICTIONS: { key: RuleMeta["jurisdiction"]; title: string }[] = [
  { key: "bc", title: "British Columbia" },
  { key: "federal", title: "Federal" },
  { key: "on", title: "Ontario" },
  { key: "qc", title: "Quebec" },
  { key: "intl", title: "International frameworks" },
];

/** Governance Map (SPEC §4, ADR-0010): generated from the rule catalogue. Not legal advice. */
export default function SourcesPage() {
  const latest = RULE_CATALOGUE.map((r) => r.lastVerified).sort().at(-1);
  return (
    <main id="main" className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-10 px-4 py-10 sm:px-10 lg:px-20">
      <header className="flex max-w-3xl flex-col gap-3">
        <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[40px]">Governance Map</h1>
        <p className="text-[17px] leading-relaxed text-ink-2">
          Every rule Splitline checks, with its status, scope, sources and the date it was last verified. Proposed bills are
          labelled &ldquo;Prepare for (proposed)&rdquo; and never count as binding.
        </p>
        <p className="text-sm text-muted-foreground">
          {RULE_CATALOGUE.length} rules · catalogue version {RULE_CATALOGUE_VERSION}
          {latest ? ` · last verified ${formatIsoDate(latest)}` : null}
        </p>
        <nav aria-label="Jurisdictions" className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {JURISDICTIONS.map((j) => (
            <a key={j.key} href={`#${j.key}`} className="inline-flex min-h-6 items-center text-brand underline underline-offset-2">
              {j.title}
            </a>
          ))}
        </nav>
      </header>

      {JURISDICTIONS.map((j) => {
        const rules = RULE_CATALOGUE.filter((r) => r.jurisdiction === j.key);
        if (rules.length === 0) return null;
        return (
          <section key={j.key} aria-labelledby={j.key} className="flex flex-col gap-4">
            <h2 id={j.key} className="scroll-mt-4 border-b border-divider pb-2 text-2xl font-semibold text-ink">
              {j.title} <span className="text-base font-normal text-muted-foreground">({rules.length})</span>
            </h2>
            <ul className="grid gap-4 lg:grid-cols-2">
              {rules.map((r) => {
                const s = catalogueStatus(r);
                return (
                  <li key={r.id} id={r.id} className="flex scroll-mt-4 flex-col gap-3 rounded-card border border-border bg-surface p-5 target:border-brand target:shadow-elevated">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge model={s.badge} />
                      <span className="font-mono text-[13px] text-muted-foreground">{r.id}</span>
                    </div>
                    <h3 className="text-lg leading-snug font-semibold text-ink">{r.title}</h3>
                    <p className="text-sm text-ink-2">{r.instrument}</p>
                    {s.scopeNote && <p className="text-sm text-muted-foreground">{s.scopeNote}</p>}
                    <p className="text-[15px] leading-relaxed text-ink-2">{r.consideration}</p>
                    <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-divider pt-3 text-[13px] text-muted-foreground">
                      <span>Verified {formatIsoDate(r.lastVerified)}</span>
                      {r.sources.map((src) => (
                        <a
                          key={src.url}
                          href={src.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-6 items-center gap-1 font-medium text-brand underline-offset-2 hover:underline"
                        >
                          {src.label}
                          <ExternalLinkIcon aria-hidden className="size-3.5" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
