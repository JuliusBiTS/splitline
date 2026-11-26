"use client";

/**
 * Step 3, "Confirm split" (SPEC §6): every AI-proposed step is editable, the user can add or
 * remove steps, and rows that bear on a decision about a person or carry a high error cost are
 * highlighted. The AI's source quote is shown read-only so the user can check the grounding.
 */
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useId } from "react";
import { buttonVariants } from "@/components/ui/button";
import type { Decomposition } from "@/engine/types";
import { cn } from "@/lib/utils";
import { Checkbox, controlClass } from "./fields";
import { editedFields, isHighlighted, MAX_SUBTASKS, MIN_SUBTASKS, type SubtaskRow } from "./intake-state";

const LEVELS3 = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
] as const;
const ERROR_COST = [...LEVELS3, { value: "critical", label: "Critical (health or safety)" }] as const;
const KNOWLEDGE = [
  { value: "codifiable", label: "Written rules or checklists" },
  { value: "tacit", label: "Experience and judgment" },
] as const;

function MiniSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[13px] font-medium text-ink-2">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={cn(controlClass, "h-9 cursor-pointer text-sm")}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function RowEditor({
  row,
  index,
  proposal,
  invalidName,
  canRemove,
  onChange,
  onRemove,
}: {
  row: SubtaskRow;
  index: number;
  proposal: Decomposition | null;
  invalidName: boolean;
  canRemove: boolean;
  onChange: (patch: Partial<SubtaskRow>) => void;
  onRemove: () => void;
}) {
  const id = useId();
  const edited = editedFields(row, proposal);
  const highlighted = isHighlighted(row);
  const quoteId = `${id}-quote`;
  return (
    <li>
      <fieldset
        className={cn(
          "flex flex-col gap-4 rounded-card border border-border bg-surface p-4 sm:p-5",
          highlighted && "border-l-4 border-l-st-prepare",
        )}
      >
        <legend className="sr-only">
          Step {index + 1}
          {row.name ? `: ${row.name}` : ""}
        </legend>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p aria-hidden className="font-mono text-xs font-medium tracking-[0.04em] text-muted-foreground uppercase">
            Step {index + 1}
            {!row.proposedId && proposal ? " · added by you" : ""}
            {edited.length > 0 ? " · edited" : ""}
          </p>
          <div className="flex items-center gap-3">
            {highlighted && (
              <span className="rounded-pill bg-st-prepare-bg px-2 py-0.5 text-[13px] font-medium text-st-prepare">
                {row.consequential ? "Bears on a decision about a person" : "High error cost"}
              </span>
            )}
            <button
              type="button"
              onClick={onRemove}
              disabled={!canRemove}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              aria-label={`Remove step ${index + 1}${row.name ? `: ${row.name}` : ""}`}
            >
              <Trash2Icon aria-hidden /> Remove
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-name`} className="text-[13px] font-medium text-ink-2">
              Step name
            </label>
            <input
              id={`${id}-name`}
              value={row.name}
              maxLength={60}
              aria-invalid={invalidName || undefined}
              onChange={(e) => onChange({ name: e.target.value })}
              className={cn(controlClass, "h-9 text-sm")}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-desc`} className="text-[13px] font-medium text-ink-2">
              What happens in this step
            </label>
            <input
              id={`${id}-desc`}
              value={row.description}
              maxLength={240}
              aria-describedby={row.sourceQuote ? quoteId : undefined}
              onChange={(e) => onChange({ description: e.target.value })}
              className={cn(controlClass, "h-9 text-sm")}
            />
          </div>
        </div>
        {row.sourceQuote && (
          <p id={quoteId} className="text-[13px] text-muted-foreground">
            From your description: <q className="text-ink-2">{row.sourceQuote}</q>
          </p>
        )}

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniSelect label="Judgment needed" value={row.judgmentIntensity} options={LEVELS3} onChange={(v) => onChange({ judgmentIntensity: v })} />
          <MiniSelect label="Know-how" value={row.knowledgeType} options={KNOWLEDGE} onChange={(v) => onChange({ knowledgeType: v })} />
          <MiniSelect label="Cost of an error" value={row.errorCost} options={ERROR_COST} onChange={(v) => onChange({ errorCost: v })} />
          <MiniSelect label="Volume" value={row.volume} options={LEVELS3} onChange={(v) => onChange({ volume: v })} />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <Checkbox label="Affects individuals" checked={row.affectsIndividuals} onChange={(v) => onChange({ affectsIndividuals: v })} />
          <Checkbox
            label="Bears on a decision about a person"
            checked={row.consequential}
            onChange={(v) => onChange({ consequential: v })}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-why`} className="text-[13px] font-medium text-ink-2">
            Why these settings (optional)
          </label>
          <input
            id={`${id}-why`}
            value={row.rationale}
            maxLength={200}
            onChange={(e) => onChange({ rationale: e.target.value })}
            className={cn(controlClass, "h-9 text-sm")}
          />
        </div>
      </fieldset>
    </li>
  );
}

export function SubtaskTable({
  rows,
  proposal,
  invalidNameKeys,
  onChange,
  onAdd,
  onRemove,
}: {
  rows: SubtaskRow[];
  proposal: Decomposition | null;
  invalidNameKeys: readonly string[];
  onChange: (key: string, patch: Partial<SubtaskRow>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col gap-3" aria-label="Steps in the process">
        {rows.map((row, i) => (
          <RowEditor
            key={row.key}
            row={row}
            index={i}
            proposal={proposal}
            invalidName={invalidNameKeys.includes(row.key)}
            canRemove={rows.length > MIN_SUBTASKS}
            onChange={(patch) => onChange(row.key, patch)}
            onRemove={() => onRemove(row.key)}
          />
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={onAdd} disabled={rows.length >= MAX_SUBTASKS} className={buttonVariants({ variant: "outline" })}>
          <PlusIcon aria-hidden /> Add a step
        </button>
        <p className="text-sm text-muted-foreground">
          {rows.length} of {MIN_SUBTASKS}–{MAX_SUBTASKS} steps
        </p>
      </div>
    </div>
  );
}
