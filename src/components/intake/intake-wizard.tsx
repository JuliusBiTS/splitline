"use client";

/**
 * `/case/new` (SPEC §4–6): Describe → Context → Confirm split.
 *
 * - Progressive disclosure: step 2 shows the essential questions; "More context" holds the rest.
 * - Live path: `/api/live-status`, then `/api/decompose`. Any refusal (`fallback: "manual"`),
 *   network error or live mode off leads to manual entry with the same fields.
 * - Nothing is analysed until the user confirms the split; the consequential floor blocks confirm.
 * - The case is saved in this browser only, then `/api/narrate` drafts the summary (always 200).
 */
import { ShieldAlertIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { newCaseId, type CaseRecordInput } from "@/case/case";
import { saveCase, DRAFT_KEY, readJson, writeJson } from "@/case/storage";
import { ProgressNarration, Stepper } from "@/components/splitline/steps";
import { buttonVariants } from "@/components/ui/button";
import { REVERSIBILITY_LABELS, valueLabel } from "@/engine/labels";
import { toStructured } from "@/engine/structured-intake";
import {
  AffectedPeopleSchema,
  AiDecisionRoleSchema,
  AiTypeSchema,
  BusinessFunctionSchema,
  DataCategorySchema,
  DynamismSchema,
  GenAiToolTypeSchema,
  HostingSchema,
  JurisdictionSchema,
  MitigationSchema,
  NarrativeSchema,
  NarrativeSourceSchema,
  OrgTypeSchema,
  ReadinessSchema,
  ReversibilitySchema,
  SectorSchema,
  TeamSetupSchema,
  UseCasePatternSchema,
  type Decomposition,
  type UseCasePattern,
} from "@/engine/types";
import { trackEvent } from "@/lib/analytics";
import { capitalize, Checkbox, CheckboxGroup, SelectField, TextField } from "./fields";
import {
  ADVANCED_DEFAULTS,
  blankRow,
  buildDecomposition,
  confirmProblems,
  DecomposeOkSchema,
  derivedReversibility,
  DESCRIPTION_MAX,
  DESCRIPTION_MIN,
  EMPTY_DRAFT,
  floorApplies,
  LiveStatusSchema,
  MAX_SUBTASKS,
  parseIntake,
  RefusalSchema,
  restoreDraft,
  rowsFromProposal,
  TITLE_MAX,
  untickedSuggestions,
  validateStep1,
  validateStep2,
  type FieldErrors,
  type IntakeDraft,
  type Step3State,
  type SubtaskRow,
} from "./intake-state";
import { SubtaskTable } from "./subtask-table";

const STEPS = ["Describe", "Context", "Confirm split"];
const DECOMPOSE_STEPS = ["Checking that live mode is available", "Breaking the process into steps", "Checking each step against your description"];
const SAVE_STEPS = ["Running the rules and the indicative tier", "Drafting the summary from the results", "Saving the case in this browser"];
const NETWORK_NOTICE = "We could not reach the AI service. Enter the steps yourself.";

type Phase = "idle" | "decomposing" | "ready" | "saving";

const EMPTY_STEP3: Step3State = { rows: [], assumptions: [], clarifyingQuestions: [], suggestedUseCasePatterns: [], confirmedNoConsequential: false };

function PersonalInfoBanner() {
  return (
    <div role="note" className="flex gap-3 rounded-card border border-st-prepare bg-st-prepare-bg p-4 text-[15px] text-ink">
      <ShieldAlertIcon aria-hidden className="mt-0.5 size-5 shrink-0 text-st-prepare" />
      <div className="flex flex-col gap-1">
        <p className="font-semibold">Don&apos;t enter personal information.</p>
        <p className="text-ink-2">
          Describe the process in general terms: no names, contact details, case numbers or health details of real people. When live
          mode is on, the description is sent to Anthropic&apos;s Claude API (US or global processing) to propose the steps. Splitline
          does not store it on a server; it stays in this browser and is never part of a share link.
        </p>
      </div>
    </div>
  );
}

function ErrorSummary({ errors, refEl }: { errors: string[]; refEl: React.RefObject<HTMLDivElement | null> }) {
  if (errors.length === 0) return null;
  return (
    <div ref={refEl} tabIndex={-1} role="alert" className="rounded-card border-2 border-st-blocker bg-st-blocker-bg p-4 text-[15px]">
      <p className="font-semibold text-st-blocker">Check {errors.length === 1 ? "this field" : "these fields"} first:</p>
      <ul className="mt-1 list-disc pl-5 text-ink">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  );
}

function StepHeading({ children, refEl }: { children: ReactNode; refEl: React.RefObject<HTMLHeadingElement | null> }) {
  return (
    <h2 ref={refEl} tabIndex={-1} className="text-xl font-semibold text-ink outline-none">
      {children}
    </h2>
  );
}

export function IntakeWizard({ today }: { today?: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<IntakeDraft>(EMPTY_DRAFT);
  const [loaded, setLoaded] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [entry, setEntry] = useState<"live" | "manual">("manual");
  const [notice, setNotice] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Decomposition | null>(null);
  const [caseToken, setCaseToken] = useState<string | null>(null);
  const [s3, setS3] = useState<Step3State>(EMPTY_STEP3);
  const [confirmTried, setConfirmTried] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const keyCounter = useRef(0);
  const nextKey = () => `row-${++keyCounter.current}`;

  // Restore a draft typed earlier in this browser (after mount, so the server HTML matches).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser storage after hydration
    setDraft(restoreDraft(readJson(DRAFT_KEY)));
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) writeJson(DRAFT_KEY, draft);
  }, [draft, loaded]);

  const set = useCallback(<K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  }, []);

  const goTo = (n: number) => {
    setStep(n);
    setErrors({});
    requestAnimationFrame(() => headingRef.current?.focus());
  };

  const showErrors = (e: FieldErrors) => {
    setErrors(e);
    requestAnimationFrame(() => errorRef.current?.focus());
  };

  const toManual = (message: string | null) => {
    setEntry("manual");
    setProposal(null);
    setCaseToken(null);
    setNotice(message);
    setS3({ ...EMPTY_STEP3, rows: [blankRow(nextKey()), blankRow(nextKey()), blankRow(nextKey())] });
    setPhase("ready");
  };

  const decompose = async () => {
    const intake = parseIntake(draft);
    if (!intake) return;
    setPhase("decomposing");
    setProgress(0);
    setNotice(null);
    try {
      const statusRes = await fetch("/api/live-status", { cache: "no-store" });
      const status = LiveStatusSchema.safeParse(await statusRes.json());
      if (!status.success || !status.data.live) return toManual(status.success ? (status.data.message ?? null) : NETWORK_NOTICE);
      setProgress(1);
      const timer = setTimeout(() => setProgress(2), 6000);
      const res = await fetch("/api/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake }),
      });
      clearTimeout(timer);
      const body: unknown = await res.json();
      const ok = DecomposeOkSchema.safeParse(body);
      if (ok.success) {
        setEntry("live");
        setProposal(ok.data.decomposition);
        setCaseToken(ok.data.caseToken);
        setS3({
          rows: rowsFromProposal(ok.data.decomposition, ok.data.grounding),
          assumptions: ok.data.decomposition.assumptions,
          clarifyingQuestions: ok.data.decomposition.clarifyingQuestions,
          suggestedUseCasePatterns: ok.data.decomposition.suggestedUseCasePatterns,
          confirmedNoConsequential: false,
        });
        setPhase("ready");
        return;
      }
      const refusal = RefusalSchema.safeParse(body);
      toManual(refusal.success ? refusal.data.message : NETWORK_NOTICE);
    } catch {
      toManual(NETWORK_NOTICE);
    }
  };

  const continueFromStep1 = () => {
    const e = validateStep1(draft);
    if (Object.keys(e).length > 0) return showErrors(e);
    goTo(1);
  };

  const continueFromStep2 = () => {
    const e = validateStep2(draft);
    if (Object.keys(e).length > 0) return showErrors(e);
    goTo(2);
    if (s3.rows.length === 0) void decompose();
  };

  const intake = parseIntake(draft);
  const problems = intake ? confirmProblems(intake, s3) : [];
  const invalidNameKeys = confirmTried ? problems.flatMap((p) => (p.kind === "names" ? p.rowKeys : [])) : [];

  const confirm = async () => {
    setConfirmTried(true);
    if (!intake || problems.length > 0) {
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    const decomposition = buildDecomposition(s3);
    setPhase("saving");
    setProgress(0);
    setSaveError(null);
    const id = newCaseId();
    const asOf = today ?? new Date().toISOString().slice(0, 10);
    let narrative: CaseRecordInput["narrative"];
    let narrativeSource: CaseRecordInput["narrativeSource"];
    try {
      setProgress(1);
      const res = await fetch("/api/narrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intake: toStructured(intake), decomposition, ...(caseToken ? { caseToken } : {}) }),
      });
      const body = (await res.json()) as { narrative?: unknown; source?: unknown };
      const n = NarrativeSchema.safeParse(body.narrative);
      const src = NarrativeSourceSchema.safeParse(body.source);
      if (n.success && src.success) {
        narrative = n.data;
        narrativeSource = src.data;
      }
    } catch {
      // The case still works without a narrative: the Summary falls back to the engine sentence.
    }
    setProgress(2);
    const saved = saveCase({
      v: 1,
      id,
      asOf,
      intake,
      fromShareLink: false,
      proposed: proposal,
      decomposition,
      ...(narrative && narrativeSource ? { narrative, narrativeSource } : {}),
      entry,
    });
    if (!saved) {
      setPhase("ready");
      setSaveError("This browser did not let Splitline save the case (private window or full storage). Allow site storage and try again.");
      return;
    }
    writeJson(DRAFT_KEY, null);
    trackEvent({ name: "live_run", props: { path: entry } });
    router.push(`/case/${id}`);
  };

  const errorList = Object.values(errors).filter((x): x is string => Boolean(x));
  const reversibilityDefault = derivedReversibility(draft);
  const suggestions = untickedSuggestions(s3.suggestedUseCasePatterns, draft.useCasePatterns);
  const showFloorCheckbox = intake ? floorApplies(intake) && !s3.rows.some((r) => r.consequential) : false;

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={STEPS} current={step} />
      <p className="text-sm text-muted-foreground md:hidden">
        The intake works best on a larger screen. You can still fill it in here, or open a preset instead.
      </p>

      {step === 0 && (
        <section aria-labelledby="step-describe" className="flex max-w-3xl flex-col gap-5">
          <StepHeading refEl={headingRef}>
            <span id="step-describe">Describe the use case</span>
          </StepHeading>
          <PersonalInfoBanner />
          <ErrorSummary errors={errorList} refEl={errorRef} />
          <TextField name="title" label="Use-case title" value={draft.title} onChange={(v) => set("title", v)} maxLength={TITLE_MAX} error={errors.title} />
          <TextField
            name="processDescription"
            label="Current process and intended AI use"
            hint="In plain words: who does what today, and what the AI should do. The AI uses this only to propose steps; the rules use only the answers in step 2."
            value={draft.processDescription}
            onChange={(v) => set("processDescription", v)}
            maxLength={DESCRIPTION_MAX}
            counter={{ min: DESCRIPTION_MIN, max: DESCRIPTION_MAX }}
            error={errors.processDescription}
            multiline
            rows={8}
          />
          <div>
            <button type="button" onClick={continueFromStep1} className={buttonVariants({ size: "lg" })}>
              Continue to context
            </button>
          </div>
        </section>
      )}

      {step === 1 && (
        <section aria-labelledby="step-context" className="flex max-w-4xl flex-col gap-6">
          <StepHeading refEl={headingRef}>
            <span id="step-context">Context</span>
          </StepHeading>
          <p className="text-[15px] text-ink-2">
            These answers decide which rules likely apply. Splitline never infers them from your description.
          </p>
          <ErrorSummary errors={errorList} refEl={errorRef} />
          <div className="grid gap-5 md:grid-cols-2">
            <SelectField name="orgType" label="Type of organization" value={draft.orgType} onChange={(v) => set("orgType", v)} options={OrgTypeSchema.options} error={errors.orgType} />
            <SelectField name="sector" label="Sector" value={draft.sector} onChange={(v) => set("sector", v)} options={SectorSchema.options} error={errors.sector} />
            <SelectField
              name="businessFunction"
              label="Business function"
              value={draft.businessFunction}
              onChange={(v) => set("businessFunction", v)}
              options={BusinessFunctionSchema.options}
              error={errors.businessFunction}
            />
            <SelectField
              name="aiDecisionRole"
              label="What the AI does in the decision"
              hint="Recommends: a person decides. Decides with review: a person checks before it takes effect."
              value={draft.aiDecisionRole}
              onChange={(v) => set("aiDecisionRole", v)}
              options={AiDecisionRoleSchema.options}
              error={errors.aiDecisionRole}
            />
            <SelectField
              name="hosting"
              label="Where the AI processes and stores data"
              value={draft.hosting}
              onChange={(v) => set("hosting", v)}
              options={HostingSchema.options.map((h) => ({ value: h, label: h === "unsure" ? "Not sure" : capitalize(valueLabel(h)) }))}
              error={errors.hosting}
            />
            <SelectField name="aiType" label="Type of AI" value={draft.aiType} onChange={(v) => set("aiType", v)} options={AiTypeSchema.options} error={errors.aiType} />
          </div>
          <CheckboxGroup
            name="affectedPeople"
            legend="Who is affected"
            values={draft.affectedPeople}
            onChange={(v) => set("affectedPeople", v)}
            options={AffectedPeopleSchema.options}
            error={errors.affectedPeople}
          />
          <CheckboxGroup
            name="dataCategories"
            legend="Data the AI uses"
            values={draft.dataCategories}
            onChange={(v) => set("dataCategories", v)}
            options={DataCategorySchema.options}
            error={errors.dataCategories}
          />
          <CheckboxGroup
            name="jurisdictions"
            legend="Where affected people live"
            values={draft.jurisdictions}
            onChange={(v) => set("jurisdictions", v)}
            options={JurisdictionSchema.options}
            error={errors.jurisdictions}
          />
          <CheckboxGroup
            name="useCasePatterns"
            legend="Use-case patterns (tick any that fit)"
            hint="Splitline uses only what you tick here. Leave all unticked if none fit."
            values={draft.useCasePatterns}
            onChange={(v) => set("useCasePatterns", v)}
            options={UseCasePatternSchema.options}
          />

          <details className="group rounded-card border border-border bg-surface">
            <summary className="flex min-h-12 cursor-pointer flex-col justify-center gap-0.5 px-4 py-3 sm:px-5">
              <span className="text-[15px] font-semibold text-ink">More context</span>
              <span className="text-sm text-muted-foreground">
                Customer-facing output, employee monitoring, team setup, readiness, mitigations and more. Until you change them: team setup{" "}
                {valueLabel(draft.teamSetup)}, readiness {draft.readiness}, not customer-facing, no employee monitoring, no mitigations.
              </span>
            </summary>
            <div className="flex flex-col gap-5 border-t border-divider px-4 py-5 sm:px-5">
              <div className="flex flex-col gap-1">
                <Checkbox label="The AI's output goes straight to customers or the public" checked={draft.customerFacingOutput} onChange={(v) => set("customerFacingOutput", v)} />
                <Checkbox label="The AI monitors or evaluates employees" checked={draft.monitorsEmployees} onChange={(v) => set("monitorsEmployees", v)} />
                <Checkbox label="This runs in a crisis or emergency context" checked={draft.crisisContext} onChange={(v) => set("crisisContext", v)} />
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <SelectField name="teamSetup" label="Who runs the AI" value={draft.teamSetup} onChange={(v) => set("teamSetup", v)} options={TeamSetupSchema.options} placeholder={null} />
                <SelectField
                  name="readiness"
                  label="How ready the team is to work with AI"
                  value={draft.readiness}
                  onChange={(v) => set("readiness", v)}
                  options={ReadinessSchema.options.map((r) => ({ value: r, label: capitalize(r) }))}
                  placeholder={null}
                />
                <SelectField
                  name="dynamism"
                  label="How fast the AI's behaviour changes"
                  hint="Left unset, Splitline uses high for generative AI and low otherwise."
                  value={draft.dynamism}
                  onChange={(v) => set("dynamism", v)}
                  options={DynamismSchema.options.map((d) => ({ value: d, label: capitalize(d) }))}
                  placeholder="Derived from the type of AI"
                />
                <SelectField
                  name="employerSize25Plus"
                  label="25 or more employees in Ontario"
                  value={draft.employerSize25Plus}
                  onChange={(v) => set("employerSize25Plus", v as IntakeDraft["employerSize25Plus"])}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                  placeholder="Not set"
                />
                <SelectField
                  name="reversibilityOverride"
                  label="How reversible a wrong outcome is"
                  hint="Pre-filled with the value Splitline derives from your answers. Changing it is named in the tier rationale."
                  value={draft.reversibilityOverride}
                  onChange={(v) => set("reversibilityOverride", v)}
                  options={ReversibilitySchema.options
                    .filter((r) => r !== reversibilityDefault)
                    .map((r) => ({ value: r, label: capitalize(REVERSIBILITY_LABELS[r]) }))}
                  placeholder={reversibilityDefault ? `${capitalize(REVERSIBILITY_LABELS[reversibilityDefault])} (derived)` : "Derived from your answers"}
                />
                {draft.aiType === "generative_llm" && (
                  <SelectField
                    name="genAiToolType"
                    label="Kind of generative AI tool"
                    value={draft.genAiToolType}
                    onChange={(v) => set("genAiToolType", v)}
                    options={GenAiToolTypeSchema.options}
                    placeholder="Not set"
                  />
                )}
              </div>
              <CheckboxGroup
                name="mitigations"
                legend="Safeguards already planned"
                values={draft.mitigations}
                onChange={(v) => set("mitigations", v)}
                options={MitigationSchema.options}
              />
              <TextField
                name="proposedKpis"
                label="KPIs you plan to track (one per line, optional)"
                value={draft.proposedKpis}
                onChange={(v) => set("proposedKpis", v)}
                error={errors.proposedKpis}
                multiline
                rows={3}
              />
              <p className="text-[13px] text-muted-foreground">
                Defaults that apply until you change them: team setup {valueLabel(ADVANCED_DEFAULTS.teamSetup)}, readiness {ADVANCED_DEFAULTS.readiness}.
              </p>
            </div>
          </details>

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => goTo(0)} className={buttonVariants({ variant: "outline", size: "lg" })}>
              Back
            </button>
            <button type="button" onClick={continueFromStep2} className={buttonVariants({ size: "lg" })}>
              {s3.rows.length > 0 ? "Continue to your steps" : "Propose the steps"}
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section aria-labelledby="step-confirm" className="flex max-w-5xl flex-col gap-5">
          <StepHeading refEl={headingRef}>
            <span id="step-confirm">Confirm the split</span>
          </StepHeading>

          {phase === "decomposing" && <ProgressNarration heading="Proposing the steps" steps={DECOMPOSE_STEPS} current={progress} />}
          {phase === "saving" && <ProgressNarration heading="Building your results" steps={SAVE_STEPS} current={progress} />}

          {(phase === "ready" || phase === "saving") && (
            <>
              <div aria-live="polite" className="flex flex-col gap-3">
                {notice && (
                  <p role="status" className="rounded-card border border-border bg-subtle p-4 text-[15px] text-ink">
                    {notice}
                  </p>
                )}
                <p className="max-w-3xl text-[15px] text-ink-2">
                  {entry === "live"
                    ? "The AI proposed these steps from your description. Check every one: what you confirm is what the analysis uses. Nothing runs until you confirm."
                    : "Enter the main steps of the process. Each step gets the same settings the AI would propose. Nothing runs until you confirm."}
                </p>
              </div>

              {suggestions.length > 0 && (
                <div className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
                  <p className="text-[15px] font-medium text-ink">Did you mean to tick these patterns?</p>
                  <p className="text-sm text-muted-foreground">The AI suggested them. Splitline uses a pattern only when you tick it.</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((p: UseCasePattern) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => set("useCasePatterns", [...draft.useCasePatterns, p])}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Tick &ldquo;{capitalize(valueLabel(p))}&rdquo;
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <SubtaskTable
                rows={s3.rows}
                proposal={proposal}
                invalidNameKeys={invalidNameKeys}
                onChange={(key, patch) => setS3((s) => ({ ...s, rows: s.rows.map((r) => (r.key === key ? { ...r, ...patch } : r)) }))}
                onAdd={() => setS3((s) => (s.rows.length >= MAX_SUBTASKS ? s : { ...s, rows: [...s.rows, blankRow(nextKey())] }))}
                onRemove={(key) => setS3((s) => ({ ...s, rows: s.rows.filter((r: SubtaskRow) => r.key !== key) }))}
              />

              {s3.assumptions.length > 0 && (
                <section aria-labelledby="assumptions" className="flex flex-col gap-2">
                  <h3 id="assumptions" className="text-base font-semibold text-ink">
                    Assumptions the AI made
                  </h3>
                  <ul className="flex flex-col gap-1">
                    {s3.assumptions.map((a, i) => (
                      <li key={a} className="flex flex-wrap items-center gap-2 text-[15px] text-ink-2">
                        <span>{a}</span>
                        <button
                          type="button"
                          onClick={() => setS3((s) => ({ ...s, assumptions: s.assumptions.filter((_, j) => j !== i) }))}
                          className={buttonVariants({ variant: "link", className: "min-h-6 text-sm" })}
                          aria-label={`Remove assumption: ${a}`}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {s3.clarifyingQuestions.length > 0 && (
                <section aria-labelledby="questions" className="flex flex-col gap-2">
                  <h3 id="questions" className="text-base font-semibold text-ink">
                    Questions worth answering (optional)
                  </h3>
                  <ul className="list-disc pl-5 text-[15px] text-ink-2">
                    {s3.clarifyingQuestions.map((q) => (
                      <li key={q}>{q}</li>
                    ))}
                  </ul>
                </section>
              )}

              {showFloorCheckbox && (
                <div className="rounded-card border border-st-prepare bg-st-prepare-bg p-4">
                  <p className="text-[15px] text-ink">
                    The AI does more than inform and the result affects people. Mark the step that bears on a decision about a person, or
                    confirm that none does. Your confirmation is shown in the tier rationale.
                  </p>
                  <Checkbox
                    label="No step bears on a decision about a person"
                    checked={s3.confirmedNoConsequential}
                    onChange={(v) => setS3((s) => ({ ...s, confirmedNoConsequential: v }))}
                  />
                </div>
              )}

              {confirmTried && problems.length > 0 && (
                <div ref={errorRef} tabIndex={-1} role="alert" className="rounded-card border-2 border-st-blocker bg-st-blocker-bg p-4 text-[15px]">
                  <p className="font-semibold text-st-blocker">Before you confirm:</p>
                  <ul className="mt-1 list-disc pl-5 text-ink">
                    {problems.map((p) => (
                      <li key={p.message}>{p.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {saveError && (
                <p role="alert" className="rounded-card border-2 border-st-blocker bg-st-blocker-bg p-4 text-[15px] text-ink">
                  {saveError}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => goTo(1)} disabled={phase === "saving"} className={buttonVariants({ variant: "outline", size: "lg" })}>
                  Back
                </button>
                <button type="button" onClick={() => void confirm()} disabled={phase === "saving"} className={buttonVariants({ size: "lg" })}>
                  Confirm split and see results
                </button>
                {entry === "manual" && (
                  <button type="button" onClick={() => void decompose()} disabled={phase === "saving"} className={buttonVariants({ variant: "ghost", size: "lg" })}>
                    Try the AI proposal again
                  </button>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}
