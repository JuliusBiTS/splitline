"use client";

import type { ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

/**
 * "Research basis" disclosure (ADR-0018): the thesis terms, propositions and honesty labels sit one
 * click below the manager-facing copy. Closed by default; keyboard-operable (Base UI accordion).
 */
export function ResearchBasis({
  children,
  label = "Research basis",
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <Accordion className={cn("rounded-control border border-divider", className)}>
      <AccordionItem value="research">
        <AccordionTrigger className="px-4 py-2 text-sm font-semibold">{label}</AccordionTrigger>
        <AccordionContent className="flex flex-col gap-2 px-4 text-sm leading-relaxed text-ink-2">{children}</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
