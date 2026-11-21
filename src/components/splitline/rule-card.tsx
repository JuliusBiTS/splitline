"use client";

import { ExternalLinkIcon } from "lucide-react";
import Link from "next/link";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { RuleCardModel } from "./rule-card.logic";
import { StatusBadge } from "./status-badge";

/** RuleCard list: Base UI accordion; first item open by default (handoff §3). */
export function RuleCardList({ rules, defaultOpen = 0 }: { rules: RuleCardModel[]; defaultOpen?: number | null }) {
  return (
    <Accordion
      defaultValue={defaultOpen === null || !rules[defaultOpen] ? [] : [rules[defaultOpen].ruleId]}
      className="rounded-card border border-border bg-surface"
    >
      {rules.map((r) => (
        <RuleCardItem key={r.ruleId} rule={r} />
      ))}
    </Accordion>
  );
}

function RuleCardItem({ rule }: { rule: RuleCardModel }) {
  return (
    <AccordionItem value={rule.ruleId}>
      <AccordionTrigger className="grid grid-cols-[1fr_24px] gap-3 px-4 py-4 sm:grid-cols-[200px_1fr_24px] sm:gap-4 sm:px-6 sm:py-5">
        <span className="flex flex-col items-start gap-1">
          <StatusBadge model={rule.badge} statusShownNearby />
          {rule.badge.kind === "blocker" && (
            <span className="text-[13px] font-normal text-muted-foreground">{rule.badge.statusLabel}</span>
          )}
        </span>
        <span className="col-start-1 row-start-2 text-base font-medium text-ink sm:col-start-2 sm:row-start-1">{rule.title}</span>
      </AccordionTrigger>
      <AccordionContent className="px-4 sm:pr-6 sm:pl-[240px]">
        <h4 className="text-sm font-semibold text-ink">Why this applies</h4>
        <p className="mt-1 text-[15px] leading-relaxed text-ink-2">{rule.consideration}</p>
        {rule.why.length > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-ink-2">
            {rule.why.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        <h4 className="mt-4 text-sm font-semibold text-ink">Consider</h4>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-ink-2">
          {rule.consider.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        {rule.redesignPath && (
          <>
            <h4 className="mt-4 text-sm font-semibold text-ink">Redesign path</h4>
            <p className="mt-1 text-[15px] text-ink-2">{rule.redesignPath}</p>
          </>
        )}
        <p className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
          <span>{rule.instrument}</span>
          <span aria-hidden>·</span>
          <span>{rule.badge.statusLabel}</span>
          <span aria-hidden>·</span>
          <span>{rule.verifiedLabel}</span>
          {rule.sources.map((s) => (
            <a
              key={s.url}
              href={s.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-6 items-center gap-1 font-medium underline-offset-2 hover:underline"
            >
              {s.label}
              <ExternalLinkIcon aria-hidden className="size-3.5" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ))}
          <Link
            href={`/sources#${rule.ruleId}`}
            className="inline-flex min-h-6 items-center font-medium text-brand underline underline-offset-2"
          >
            See {rule.ruleId} on the Governance Map
          </Link>
        </p>
      </AccordionContent>
    </AccordionItem>
  );
}
