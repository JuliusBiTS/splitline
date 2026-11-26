"use client";

/**
 * Form primitives for the intake. Native inputs restyled with tokens: they are keyboard- and
 * screen-reader-friendly out of the box, and every control has a visible label and a ≥ 24 px target.
 */
import { useId, type ReactNode } from "react";
import { valueLabel } from "@/engine/labels";
import { cn } from "@/lib/utils";

export const controlClass =
  "w-full rounded-control border border-border-strong bg-surface px-3 text-[15px] text-ink placeholder:text-faint aria-invalid:border-2 aria-invalid:border-st-blocker";

function ErrorText({ id, error }: { id: string; error?: string }) {
  return error ? (
    <p id={id} className="text-sm font-medium text-st-blocker">
      {error}
    </p>
  ) : null;
}

export function TextField({
  label,
  hint,
  value,
  onChange,
  error,
  maxLength,
  name,
  counter,
  multiline,
  rows = 6,
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  maxLength?: number;
  name: string;
  counter?: { min?: number; max: number };
  multiline?: boolean;
  rows?: number;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const countId = `${id}-count`;
  const describedBy = [hint ? hintId : null, counter ? countId : null, error ? errId : null].filter(Boolean).join(" ") || undefined;
  const len = value.trim().length;
  const shared = {
    id,
    name,
    value,
    maxLength,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy,
  } as const;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-medium text-ink">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {multiline ? (
        <textarea {...shared} rows={rows} onChange={(e) => onChange(e.target.value)} className={cn(controlClass, "py-2 leading-relaxed")} />
      ) : (
        <input {...shared} type="text" onChange={(e) => onChange(e.target.value)} className={cn(controlClass, "h-10")} />
      )}
      {counter && (
        <p id={countId} className="text-[13px] text-muted-foreground tabular-nums">
          {len} / {counter.max} characters{counter.min && len < counter.min ? ` (at least ${counter.min})` : ""}
        </p>
      )}
      <ErrorText id={errId} error={error} />
    </div>
  );
}

export function SelectField({
  label,
  hint,
  value,
  onChange,
  options,
  error,
  name,
  placeholder = "Choose…",
}: {
  label: string;
  hint?: ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: readonly (string | { value: string; label: string })[];
  error?: string;
  name: string;
  placeholder?: string | null;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-medium text-ink">
        {label}
      </label>
      {hint && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={[hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined}
        className={cn(controlClass, "h-10 cursor-pointer")}
      >
        {placeholder !== null && <option value="">{placeholder}</option>}
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? capitalize(valueLabel(o)) : o.label;
          return (
            <option key={v} value={v}>
              {l}
            </option>
          );
        })}
      </select>
      <ErrorText id={errId} error={error} />
    </div>
  );
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Multi-select as a fieldset of checkboxes. */
export function CheckboxGroup({
  legend,
  hint,
  values,
  onChange,
  options,
  error,
  name,
}: {
  legend: string;
  hint?: ReactNode;
  values: readonly string[];
  onChange: (v: string[]) => void;
  options: readonly string[];
  error?: string;
  name: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  return (
    <fieldset
      className="flex flex-col gap-2"
      aria-invalid={error ? true : undefined}
      aria-describedby={[hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined}
    >
      <legend className="mb-1 text-[15px] font-medium text-ink">{legend}</legend>
      {hint && (
        <p id={hintId} className="-mt-1 text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {options.map((o) => (
          <Checkbox
            key={o}
            name={name}
            label={capitalize(valueLabel(o))}
            checked={values.includes(o)}
            onChange={(checked) => onChange(checked ? [...values, o] : values.filter((x) => x !== o))}
          />
        ))}
      </div>
      <ErrorText id={errId} error={error} />
    </fieldset>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  name,
  describedBy,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  name?: string;
  describedBy?: string;
}) {
  return (
    <label className="inline-flex min-h-8 cursor-pointer items-center gap-2 text-[15px] text-ink-2">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={describedBy}
        className="size-5 shrink-0 cursor-pointer accent-brand"
      />
      {label}
    </label>
  );
}
