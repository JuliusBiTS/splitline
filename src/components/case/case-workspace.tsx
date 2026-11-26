"use client";

/**
 * `/case/[id]` (SPEC §4): the same tabs and panels as a preset, computed in the browser from the
 * locally stored case (or a share link). "Today" is the case's as-of date, so results reproduce.
 */
import { LinkIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { descriptionOf, structuredIntakeOf, type CaseRecord } from "@/case/case";
import { encodeShare } from "@/case/share";
import { deleteCase } from "@/case/storage";
import { formatIsoDate } from "@/components/splitline/format";
import { buttonVariants } from "@/components/ui/button";
import { inventoryRecord, verdictReason } from "@/components/workspace/model";
import { ExportPanel, OperatingModelPanel, RolloutPanel, SummaryPanel, TriagePanel } from "@/components/workspace/panels";
import { WhatIfPanel } from "@/components/workspace/what-if-panel";
import { WorkspaceTabs } from "@/components/workspace/workspace-tabs";
import { narrativeProvenance, type NarrativeView } from "@/content/presets/narratives";
import { computeCase } from "@/engine";
import { valueLabel } from "@/engine/labels";
import { intakeFromStructured } from "@/engine/structured-intake";
import { applyWhatIf } from "@/engine/whatif";
import type { IntakeInputRaw } from "@/engine/types";
import { charterMarkdown } from "@/export/charter";
import { siteUrl } from "@/lib/site";
import { useCaseRecord } from "./use-case-record";

export const SHARED_NARRATIVE_NOTE =
  "Opened from a share link: the AI-written summary and the free-text description stay with whoever made this case. The results are the same, because the engine reads only the answers and the confirmed steps.";
const NO_NARRATIVE_NOTE = "There is no written summary for this version of the case (it was changed with What-if, or the summary could not be drafted). The verdict explanation above comes from the results.";

export function CaseMessage({ title, text }: { title: string; text: string }) {
  return (
    <section aria-live="polite" className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink">{title}</h1>
      <p className="text-[15px] text-ink-2">{text}</p>
      <div className="flex flex-wrap gap-3">
        <Link href="/case/new" className={buttonVariants({ size: "lg" })}>
          Start your own case
        </Link>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Open a preset
        </Link>
      </div>
    </section>
  );
}

/** Full engine intake for a record (a shared record gets the fixed placeholder description). */
export function engineIntakeOf(record: CaseRecord): IntakeInputRaw {
  return descriptionOf(record) !== null ? (record.intake as IntakeInputRaw) : intakeFromStructured(structuredIntakeOf(record));
}

export function narrativeViewOf(record: CaseRecord): NarrativeView | null {
  return record.narrative && record.narrativeSource
    ? { narrative: record.narrative, source: record.narrativeSource, provenance: narrativeProvenance(record.narrativeSource, undefined, formatIsoDate(record.asOf)) }
    : null;
}

function Workspace({ record, onChange }: { record: CaseRecord; onChange: (r: CaseRecord) => void }) {
  const router = useRouter();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const intake = useMemo(() => engineIntakeOf(record), [record]);
  const r = useMemo(() => computeCase(intake, record.decomposition, { today: record.asOf }), [intake, record]);
  const reason = verdictReason(r);
  const narrative = narrativeViewOf(record);
  const recordJson = inventoryRecord(`case-${record.id}`, intake, r, record.asOf);
  const markdown = charterMarkdown({
    title: intake.title,
    asOf: record.asOf,
    result: r,
    decomposition: record.decomposition,
    reason,
    narrative,
    url: `${siteUrl()}/case/${record.id}`,
  });
  const narrativeNote = record.fromShareLink ? SHARED_NARRATIVE_NOTE : record.entry !== "shared" && !narrative ? NO_NARRATIVE_NOTE : undefined;

  const share = async () => {
    const hash = await encodeShare({ asOf: record.asOf, intake: structuredIntakeOf(record), decomposition: record.decomposition });
    const url = `${window.location.origin}/case/${record.id}#${hash}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied");
    } catch {
      // The link is shown in a text field below, so it can be copied by hand.
    }
  };

  return (
    <>
      <header className="flex flex-col gap-3">
        <p className="font-mono text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase">
          {valueLabel(intake.orgType)} · {record.fromShareLink ? "Shared case" : "Your case"}
        </p>
        <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[36px]">{intake.title}</h1>
        <p className="text-sm text-muted-foreground">
          Saved in this browser only · results as of {formatIsoDate(record.asOf)} ·{" "}
          {record.entry === "live" ? "steps proposed by AI and confirmed by you" : record.entry === "manual" ? "steps entered by hand" : "opened from a share link"}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void share()} className={buttonVariants({ variant: "outline" })}>
            <LinkIcon aria-hidden /> Copy share link
          </button>
          {!confirmDelete ? (
            <button type="button" onClick={() => setConfirmDelete(true)} className={buttonVariants({ variant: "ghost" })}>
              <Trash2Icon aria-hidden /> Delete from this browser
            </button>
          ) : (
            <span role="group" aria-label="Confirm delete" className="flex flex-wrap items-center gap-2 text-sm text-ink">
              Delete this case from this browser? It cannot be undone.
              <button
                type="button"
                className={buttonVariants({ variant: "destructive", size: "sm" })}
                onClick={() => {
                  deleteCase(record.id);
                  toast.success("Case deleted from this browser");
                  router.push("/case/new");
                }}
              >
                Delete
              </button>
              <button type="button" className={buttonVariants({ variant: "outline", size: "sm" })} onClick={() => setConfirmDelete(false)}>
                Keep it
              </button>
            </span>
          )}
        </div>
        {shareUrl && (
          <div className="flex max-w-3xl flex-col gap-1">
            <label htmlFor="share-url" className="text-sm font-medium text-ink">
              Share link (answers and confirmed steps only; never your description)
            </label>
            <input id="share-url" readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} className="h-10 w-full rounded-control border border-border-strong bg-subtle px-3 font-mono text-[13px] text-ink" />
          </div>
        )}
      </header>
      <WorkspaceTabs
        panels={{
          summary: <SummaryPanel r={r} reason={reason} decomposition={record.decomposition} narrative={narrative} narrativeNote={narrativeNote} />,
          triage: <TriagePanel r={r} />,
          model: <OperatingModelPanel r={r} decomposition={record.decomposition} />,
          rollout: <RolloutPanel r={r} />,
          export: <ExportPanel r={r} record={recordJson} title={intake.title} markdown={markdown} charterHref={`/case/${record.id}/charter`} source="case" />,
        }}
      />
      <WhatIfPanel
        key={JSON.stringify(intake)}
        intake={intake}
        decomposition={record.decomposition}
        dynamism={r.facts.dynamism}
        today={record.asOf}
        base={{
          verdict: r.verdict.verdict,
          tier: r.tier.level,
          rulesCount: r.triggeredRules.length,
          blockersCount: r.triggeredRules.filter((t) => t.severity === "blocker").length,
        }}
        onApply={(toggles) => {
          const next = applyWhatIf(record.fromShareLink ? (structuredIntakeOf(record) as IntakeInputRaw) : (record.intake as IntakeInputRaw), toggles);
          // A narrative written for the old design no longer matches, so it is dropped.
          onChange({ ...record, intake: next as CaseRecord["intake"], narrative: undefined, narrativeSource: undefined });
          toast.success("What-if changes applied to this case");
        }}
      />
    </>
  );
}

export function CaseWorkspace() {
  const [state, update] = useCaseRecord();
  if (state.status === "loading") return <p aria-live="polite" className="text-[15px] text-muted-foreground">Loading the case from this browser…</p>;
  if (state.status === "missing")
    return (
      <CaseMessage
        title="Case not found in this browser"
        text="Cases are saved only in the browser where they were made. If someone sent you this case, ask them for the full share link."
      />
    );
  if (state.status === "error") return <CaseMessage title="This link could not be opened" text={state.message} />;
  return <Workspace record={state.record} onChange={update} />;
}
