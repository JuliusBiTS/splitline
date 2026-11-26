"use client";

import Link from "next/link";
import { useMemo } from "react";
import type { CaseRecord } from "@/case/case";
import { CharterView } from "@/components/export/charter-view";
import { PrintButton } from "@/components/export/print-button";
import { verdictReason } from "@/components/workspace/model";
import { computeCase } from "@/engine";
import { charterModel } from "@/export/charter";
import { siteUrl } from "@/lib/site";
import { CaseMessage, engineIntakeOf, narrativeViewOf } from "./case-workspace";
import { useCaseRecord } from "./use-case-record";

function Charter({ record }: { record: CaseRecord }) {
  const m = useMemo(() => {
    const intake = engineIntakeOf(record);
    const result = computeCase(intake, record.decomposition, { today: record.asOf });
    return charterModel({
      title: intake.title,
      asOf: record.asOf,
      result,
      decomposition: record.decomposition,
      reason: verdictReason(result),
      narrative: narrativeViewOf(record),
      url: `${siteUrl()}/case/${record.id}`,
    });
  }, [record]);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/case/${record.id}?tab=export`} className="min-h-6 text-[15px] font-medium text-brand underline underline-offset-2">
          Back to the workspace
        </Link>
        <PrintButton />
      </div>
      <CharterView m={m} />
    </>
  );
}

/** Printable charter for a live case (SPEC §11), read from this browser. */
export function CaseCharter() {
  const [state] = useCaseRecord();
  if (state.status === "loading") return <p aria-live="polite" className="text-[15px] text-muted-foreground">Loading the case from this browser…</p>;
  if (state.status === "ready") return <Charter record={state.record} />;
  return <CaseMessage title="Case not found in this browser" text="Open the case from the browser where it was made, then print the charter from its Export tab." />;
}
