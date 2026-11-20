# Splitline: Product Specification

**Version:** 1.0 (spec locked after the Phase 0 interview) · **Date:** 2026-11-20 · **Owner:** Julius Wölki
**Tagline:** *Design where the machine ends and judgment begins.*

> This spec is the source of truth for *what* to build. `docs/PLAN.md` says *in which order*. `docs/research/*` holds the evidence. If this spec and the research disagree, raise it; do not silently pick one. Section 14 records the interview decisions and the items explicitly deferred (each with an ADR). Changes since v0.9 are summarized in §15.

---

## 1. Product summary

Splitline is a web app that takes a proposed AI use case from idea to an implementation-ready operating model in about 15 minutes, then measures whether the human–AI work is actually reinforcing itself after launch.

It combines three things:
1. **Indicative governance triage** for Canada and British Columbia: a deterministic rules engine with status-labelled rules and sources.
2. **Operating-model design** from the author's M.Sc. thesis (*Holding the Paradox*): the split, decision rights, coordination, exchange, guardrails and direct cost.
3. **Post-launch measurement:** the Reinforcement Pulse (survey) and the Living Lab Lite (log-based demo on a claims-intake workflow).

**Primary audience:** AI CoE leads, AI enablement and transformation managers, consultants.
**Secondary audience:** recruiters and hiring managers evaluating the author. They must get value in about 10 seconds via presets.

## 2. Goals and non-goals

**Goals (MVP)**
- G1: Each of the 4 presets opens instantly (no API call) and tells a complete story.
- G2: A user can run their own use case live (rate-limited), confirm an AI-proposed task split, and export a charter.
- G3: Every legal statement carries a status label, a source and a last-verified date; nothing reads as legal advice.
- G4: Thesis logic is represented faithfully (see `docs/research/02_thesis-to-product-mapping.md`).
- G5: The Living Lab demonstrates that the same AI with a different organization of work produces different reinforcement.
- G6: WCAG 2.2 AA; readable on a phone for landing, summaries and the Lab dashboard.

**Non-goals (MVP)**
- Accounts, login, multi-tenant data, server-side persistence.
- File uploads from users (the Lab uses bundled synthetic documents only).
- An official Algorithmic Impact Assessment (the tool gives an *AIA-inspired indicative tier*).
- Jurisdictions outside Canada; French UI (possible later).

## 3. Users and core jobs

| Job | Screen(s) | Success signal |
|---|---|---|
| Should this use case proceed, and under what conditions? | Intake → Summary | Verdict + top 3 conditions understood in < 1 min |
| How do we organize the human–AI work? | Operating model | Split Map + 3 Lever cards + direct cost |
| What do we put in front of a steering committee? | Export | 1-page charter (MD/print-PDF) + inventory JSON |
| Is it working after launch? | Pulse, Lab | 2×2 position, lagging driver → lever |

## 4. Information architecture (routes)

| Route | Content |
|---|---|
| `/` | Hero (1 line + tagline), preset gallery (4 cards), "Start your own", 30-second how-it-works, footer (About, Sources, Self-assessment, small author credit). No author card on `/` (ADR-0010). |
| `/case/new` | 3-step intake: **Describe → Context → Confirm split** |
| `/case/[id]` | Workspace tabs: **Summary · Triage · Operating model · Rollout · Export**; What-if drawer |
| `/preset/[slug]` | Same workspace, loaded from committed JSON (no API) |
| `/lab` | Living Lab Lite: Review queue · Rule inbox · Split register · Dashboard · Autoplay compare |
| `/pulse` | Reinforcement Pulse survey (9 items) + result |
| `/sources` | All rules: status, scope, source links, last verified. Promoted in the **main navigation** as "Governance Map" and linked from every RuleCard (ADR-0010). |
| `/self-assessment` | Splitline assessed by its own engine; states that Claude API inference runs in the US/global (no Canadian geo) |
| `/about` | Thesis in 150 words, limits, an "About the author" card |

**Main navigation:** Presets (`/`) · Start your own (`/case/new`) · Living Lab (`/lab`) · Pulse (`/pulse`) · Governance Map (`/sources`).

Case IDs are client-side (stored in `localStorage` plus a URL-hash share link). No server storage. **The share link carries structured data only** (all intake fields except `processDescription`, plus the confirmed decomposition). The free-text description stays in the creator's `localStorage`; results reproduce fully because the engine never reads free text (ADR-0008).

## 5. Intake (input model)

Progressive disclosure: step 2 shows 8 essential questions (the original 6 plus `sector` and `useCasePatterns`); "More context" reveals the rest. Rule-relevant facts come only from fields the user sets; nothing that triggers a rule is inferred from free text (ADR-0006).

```ts
type OrgType =
  | "bc_private" | "bc_public_body" | "bc_crown_corp" | "bc_health_authority"
  | "federal_institution" | "federally_regulated_fi" | "other_canadian_private";

type AiDecisionRole = "informs" | "recommends" | "decides_with_review" | "decides_alone";
type DataCategory =
  | "no_personal" | "customer_pi" | "employee_hr" | "health"
  | "financial" | "biometric" | "children";
type Hosting = "in_canada" | "us_or_global_api" | "unsure";
type AiType = "generative_llm" | "classical_ml" | "rules";
type Dynamism = "high" | "medium" | "low"; // default derived from AiType
type TeamSetup = "separate_ai_team" | "embedded" | "vendor_run";
type Readiness = "low" | "medium" | "high";
// v1.0 additions (ADR-0006)
type Sector = "insurance" | "health_care" | "financial_services" | "government_ministry" | "other";
type UseCasePattern =
  | "hiring_selection"        // ON-ESA-AI, BC-HRC-01
  | "performance_management"  // BC-HRC-01, BC-PIPA-MON (with monitorsEmployees)
  | "clinical_triage"         // HC-SAMD-01: prioritizes, triages or recommends clinical action
  | "ambient_scribe"          // BC-OIPC-SCRIBE: ambient recording or transcription
  | "claims_eligibility"      // INS-FAIR: claims, underwriting, benefits eligibility
  | "administrative_decision" // FED-DADM-01: administrative decision about a client
  | "customer_chatbot";       // LIAB-CUSTFACING (with customerFacingOutput)
type Mitigation =
  | "human_final_decision" | "appeal_path" | "explanation_available"
  | "predeployment_testing" | "monitoring_plan";
type Reversibility = "reversible_brief" | "short_term" | "hard_to_reverse" | "irreversible"; // DADM anchors

interface IntakeInput {
  title: string;                      // ≤ 80 chars
  processDescription: string;         // 200–2,000 chars; current process + intended AI use
  orgType: OrgType;
  businessFunction: "operations" | "health_services" | "hr" | "legal_compliance" | "customer_service" | "finance" | "other";
  aiDecisionRole: AiDecisionRole;
  affectedPeople: Array<"public_customers" | "employees_applicants" | "patients" | "businesses_only">;
  dataCategories: DataCategory[];
  jurisdictions: Array<"bc" | "ontario" | "quebec" | "other_provinces">;
  hosting: Hosting;
  aiType: AiType;
  dynamism?: Dynamism;                // advanced
  customerFacingOutput: boolean;      // advanced
  monitorsEmployees: boolean;         // advanced; true triggers BC-PIPA-MON
  teamSetup: TeamSetup;               // advanced
  readiness: Readiness;               // advanced
  crisisContext?: boolean;            // advanced
  proposedKpis?: string[];            // advanced; used for drift check
  employerSize25Plus?: boolean;       // advanced; Ontario ESA
  // v1.0 additions (ADR-0006)
  sector: Sector;                     // essential (step 2)
  useCasePatterns: UseCasePattern[];  // essential (step 2), multi-select, may be empty
  mitigations?: Mitigation[];         // advanced; default []; checkboxes, unticked by default
  reversibilityOverride?: Reversibility; // advanced; default = engine-derived value (§7.2)
}
```

- `sector`, `useCasePatterns`, `mitigations` and `reversibilityOverride` are deterministic user inputs. The LLM may *suggest* patterns (see §6), but only ticked values reach the engine.
- The reversibility field in "More context" is pre-filled with the derived default and shows the DADM anchor wording; an override is named in the tier rationale ("Reversibility set by user: hard to reverse").

## 6. Task decomposition (LLM, confirmed by the user)

```ts
interface Subtask {
  id: string;                 // "s1".."s8"
  name: string;               // ≤ 60 chars
  description: string;        // ≤ 240 chars
  judgmentIntensity: "low" | "medium" | "high";
  knowledgeType: "codifiable" | "tacit";
  errorCost: "low" | "medium" | "high" | "critical";
  volume: "low" | "medium" | "high";
  affectsIndividuals: boolean;
  consequential: boolean;     // legal or similarly significant effect
  rationale: string;          // ≤ 200 chars, why these attributes
}
interface Decomposition {
  subtasks: Subtask[];        // 3–8
  assumptions: string[];      // ≤ 5
  clarifyingQuestions: string[]; // ≤ 3, shown but optional
  suggestedUseCasePatterns: UseCasePattern[]; // shown as "Did you mean to tick …?"; never applied automatically
}
```

- **WHEN** the user submits steps 1–2, **THE system SHALL** call `/api/decompose` and show the subtasks as an editable table (step 3).
- **THE system SHALL NOT** run the analysis until the user confirms the subtasks ("Confirm split").
- **Consequential floor (ADR-0006):** **IF** `aiDecisionRole` ≠ `informs` **AND** `affectedPeople` contains anything other than `businesses_only` **AND** no subtask is marked `consequential`, **THE system SHALL** block "Confirm split" and ask the user to mark the step that bears on the decision about a person, or to confirm explicitly that none does (that confirmation is shown in the tier rationale).
- Rows with `consequential = true` or `errorCost` ∈ {high, critical} are visually highlighted in the table, and the tier rationale names the subtask that supplied the "most consequential subtask" points.
- **WHEN** `suggestedUseCasePatterns` contains patterns the user has not ticked, **THE system SHALL** show them as one-click suggestions in step 3; the engine uses only ticked patterns.
- **IF** live mode is unavailable (rate limit, budget cap, error), **THE system SHALL** offer manual subtask entry with the same fields.

## 7. Engine (deterministic, pure TypeScript, no network)

### 7.1 Rules
```ts
type RuleStatus = "IN_FORCE" | "IN_FORCE_FUTURE" | "PROPOSED" | "REGULATOR_GUIDANCE"
  | "GOVERNMENT_POLICY" | "VOLUNTARY" | "REFERENCE";
type Severity = "info" | "action" | "blocker";

interface RuleDefinition {
  id: string;                      // e.g. "BC-FIPPA-XB"
  title: string;
  jurisdiction: "federal" | "bc" | "on" | "qc" | "intl";
  instrument: string;              // e.g. "BC FIPPA s. 33.1 + B.C. Reg. 294/2021"
  status: RuleStatus;
  effectiveDate?: string;          // ISO, for IN_FORCE_FUTURE
  appliesWhen: (c: CaseFacts) => boolean;
  severity: (c: CaseFacts) => Severity;
  consideration: string;           // plain-language why
  actionsToConsider: string[];
  sources: Array<{ label: string; url: string }>;
  lastVerified: string;            // ISO date
}
interface TriggeredRule { ruleId: string; severity: Severity; matchedFacts: string[] }
```
- Rules live as data in `src/content/rules/` (one file per jurisdiction). The catalogue starts from `docs/research/01_*`, section 3.
- `matchedFacts` lists the intake values that triggered the rule (shown in RuleCard as "Why this applies").

**Evaluation order (ADR-0007):** `IntakeInput` + confirmed `Decomposition` → `CaseFacts` → **tier** (§7.2) → **rules** (predicates may read the tier, e.g. `FED-DADM-HITL`) → **severity cap** → **verdict** (§7.3) → operating model (§7.4) → rollout (§7.5). The tier never reads rule results, so there is no cycle.

**Severity cap by status (ADR-0007), enforced in code and by a test:**

| Status | Max severity |
|---|---|
| `IN_FORCE`, `IN_FORCE_FUTURE` | blocker |
| `GOVERNMENT_POLICY` where the org is in scope (e.g. `federal_institution` for DADM) | blocker |
| `REGULATOR_GUIDANCE` | blocker (e.g. `BC-PIPA-MON`) |
| `PROPOSED`, `VOLUNTARY`, `REFERENCE`, and `GOVERNMENT_POLICY` out of scope | **info** (UI: "Prepare for (proposed)", "Good practice", "Reference framework") |

`effectiveSeverity = min(rule.severity(facts), cap(status, facts))`. A PROPOSED bill can never change the verdict.

**Sensitive personal information (`BC-FIPPA-XB`, ADR-0007):** `health`, `biometric`, `children`, `financial` → triggers as `action`. Any other personal category (`customer_pi`, `employee_hr`) → triggers as `info` with "Assess whether this information is sensitive; the head of the public body decides (B.C. Reg. 294/2021 does not define 'sensitive')." `no_personal` alone → does not trigger.

**Hosting `unsure` (ADR-0007):** treated as outside Canada for every cross-border rule. `matchedFacts` contains "Hosting unknown; assumed outside Canada", and each such rule adds the action "Confirm the vendor's processing and storage region". The What-if toggle `hosting → in_canada` shows the effect.

### 7.2 Indicative impact tier (AIA-inspired, *not* an official AIA)

Raw impact points (initial calibration; tune so the golden cases hit the expected tiers; record the final weights in an ADR):

| Factor | Values → points |
|---|---|
| AI decision role | informs 1 · recommends 3 · decides_with_review 5 · decides_alone 8 |
| Most consequential subtask | none 0 · consequential 4 |
| Data sensitivity (max) | no_personal 0 · customer_pi 2 · financial 3 · employee_hr 4 · health/biometric/children 5 |
| Affected people | businesses_only 0 · public_customers 2 · employees_applicants 3 · patients 4 |
| Reversibility (derived default, user can override; see below) | reversible_brief 0 · short_term 2 · hard_to_reverse 4 · irreversible 6 |
| Scale/vulnerability (derived; see below) | 0–3 |
| Customer-facing generative output | +2 |

Maximum = sum of the maxima (computed in code; 32 with the table above).

**Reversibility default (ADR-0004; table finalized in Phase 1):** start from the decision role (informs → reversible_brief; recommends or decides_with_review → short_term; decides_alone → hard_to_reverse); move one step up if `useCasePatterns` contains `hiring_selection`, `clinical_triage` or `claims_eligibility`; move one step down if `appeal_path` is among the mitigations. Clamp to the four anchors. `reversibilityOverride` replaces the derived value.

**Scale/vulnerability (derived, capped at 3):** +1 if `affectedPeople` contains `patients` or `dataCategories` contains `children`; +1 if `affectedPeople` contains `public_customers` or `patients`; +1 if any subtask with `affectsIndividuals = true` has `volume = high`.

**Mitigation deduction:** five equal-weight checkboxes (`mitigations`). If ≥ 4 of 5 (≥ 80%) are ticked, deduct 15% of the raw score (mirrors the AIA mechanic). Unticked by default; presets set realistic values; What-if may toggle them.

**Level:** `pct = 100 × score / maximum` after any deduction. **I if pct ≤ 25 · II if ≤ 50 · III if ≤ 75 · IV otherwise.** Thresholds are fixed (AIA). Only the weights may be calibrated, each within ±1 point of this table; if a golden case still misses, stop and ask (ADR-0004).

**THE system SHALL** show the tier with a rationale listing the top 3 contributing factors and the label "AIA-inspired indicative tier".

### 7.3 Verdict
- **Stop:** a blocker with no redesign path (reserved; none in the MVP catalogue).
- **Redesign:** ≥ 1 blocker with a redesign path (e.g. `BC-PIPA-MON`).
- **Go with conditions:** ≥ 1 `action` and no blockers.
- **Go:** only `info` rules.

Verdict uses `effectiveSeverity` (after the status cap in §7.1).

**Top 3 conditions (ADR-0007):** rank triggered rules with effective severity ≥ action by (1) severity (blocker > action), (2) bindingness (IN_FORCE > IN_FORCE_FUTURE > GOVERNMENT_POLICY > REGULATOR_GUIDANCE), (3) whether `matchedFacts` include one of the top 3 tier factors, (4) catalogue order. Fully deterministic.

### 7.4 Operating model (thesis logic; spec in `docs/research/02_*`, section 3)

```ts
type SplitOwner = "machine" | "machine_review" | "human";
interface SplitItem { subtaskId: string; owner: SplitOwner; reason: string }
interface LeverCard {
  lever: "decision_rights" | "coordination" | "exchange";
  setting: string; guardrail: string; directCost: string;
  monitoringIndicator: string; warningIndicator: string; details: string[];
}
interface OperatingModel {
  split: SplitItem[];
  splitReviewCadence: "monthly" | "bimonthly" | "quarterly";
  levers: [LeverCard, LeverCard, LeverCard];
  driftCheck: { ok: boolean; missing: Array<"augmentation_value" | "learning_loop">; suggestedKpis: string[] };
  scopeNotes: string[];   // e.g. central guardrails for codifiable + tier ≥ III; crisis reversal
}
```
- Split heuristic, lever settings, cadence and drift check follow `02_*` §3 exactly.
- **IF** tier ≥ III, **THE system SHALL** set every subtask that bears on the consequential decision to `machine_review` or `human`, and the Decision Rights card SHALL require a human final decision (rule `FED-DADM-HITL`). This holds even though `FED-DADM-HITL` is capped at `info` for non-federal organizations: the cap affects the verdict, not the operating model.
- **Precedence (ADR-0007):** apply the `02_*` §3.2 heuristic first, then the tier override. Owners only move toward more human control (`machine` → `machine_review` → `human`); the override never downgrades `human` to `machine_review`. When several heuristic branches match, the most human one wins.

### 7.5 Rollout (90 days)
Three phases (Days 1–30 Foundation & guardrails; 31–60 Shadow pilot & calibration; 61–90 Controlled scale & audit). Each phase has deliverables, KPIs and gate criteria. Deliverables come from triggered rules (e.g. a PIA) and from the levers (shared platform, standardized base, joint sessions). KPIs always include one efficiency, one augmentation-value and one learning-loop KPI.

### 7.6 What-if
Toggles: hosting, AI decision role, Quebec/Ontario affected, crisis, dynamism, customer-facing. **WHEN** a toggle changes, **THE system SHALL** recompute synchronously (< 100 ms) and show diff chips (e.g. "Tier II → III", "+2 rules", "Verdict unchanged").

### 7.7 Reinforcement Pulse
- 9 items (A1–A3, B1–B3, D1–D3) taken from the thesis, Table 5, with citation; 1–7 scale. Item wording sits behind one content switch (`verbatim` | `paraphrased`) until written permission is on file (ADR-0009).
- **Role selector = context only (ADR-0009):** the single respondent answers all 9 items. The chosen role (augmentation work / AI team / lead) is shown with the result, plus the note "Table 5 intends A items for augmentation staff and B items for the AI team; the other side may see it differently."
- Scoring per `02_*` §3.7.
- Output: 2×2, the minimum highlighted, lagging driver → lever card with guardrail, and the note "illustrative, not validated".
- Single respondent in the MVP; team aggregation is a later feature (would need n ≥ 5 anonymity).

## 8. LLM layer (server-only)

- **Model:** `claude-sonnet-5-5` (pinned in one constant). SDK: `@anthropic-ai/sdk`, `messages.parse()` with `output_config: { format: zodOutputFormat(schema) }`.
- **Schemas:** no `min`/`max`/`minLength` constraints relied upon server-side without a local check; no `oneOf`; `additionalProperties: false`.
- **Prompt caching** on the system prompt and rule context.
- **Endpoints:**
  - `POST /api/decompose`: IntakeInput → Decomposition.
  - `POST /api/narrate`: EngineResult → Narrative `{ executiveSummary, splitNarrative, leverNarratives[3], rolloutNarrative }`. **Guard:** every rule ID or statute name in the text must be in the triggered set; otherwise retry once, then use template text. The statute lexicon is built from the catalogue (`id` plus a short-name list per `instrument`, e.g. "PIPEDA", "FIPPA", "Law 25", "C-36"), so a statute counts as mentioned when any of its names appears.
  - `POST /api/lab/extract` (live demo only): synthetic document → Extraction (see §9).
- **Injection hygiene:** user text sits in delimited blocks and is declared as data in the system prompt; the output is schema-validated.
- **Resilience:**
  - 429 with `retry-after` → one retry if ≤ 10 s.
  - `ramp_limit_exceeded` → back off.
  - `enforced_spend_limit_reached` → no retry; disable live mode and show cached/manual paths.
- **Rate limiting (ADR-0008):**
  - One **run** = one call to `/api/decompose`. It returns a signed, short-lived case token; one `/api/narrate` call per token is free. A narrate call without a valid token counts as a run.
  - Upstash sliding window: 10 runs per IP per hour.
  - `/api/lab/extract`: its own limit of 3 per IP per hour.
  - All live calls (decompose, narrate, extract) count toward the global `DAILY_LIVE_RUN_CAP` (default 100 per UTC day).

## 9. Living Lab Lite (spec in `docs/research/05_living-lab-design.md`)

- **Scenario:** fictional "Cascadia Public Auto" receipt reimbursement. All data synthetic and generated by `scripts/generate-synthetic-docs.ts` (ground truth JSON → HTML → PNG/PDF via Playwright). About 30 documents in total.
- **Size (ADR-0009):** guided mode = **2 episodes × 8 documents** (≈ 2 minutes). Autoplay compare simulates **6 episodes per team** so the two trails diverge visibly.
- **Pre-recorded model runs:** `scripts/record-lab-runs.ts` runs Claude once over all documents and commits the outputs (`src/content/lab/recorded/*.json`) together with model ID and date.
- **Pipeline (pure TS):** validation rules → grounding check (`sourceQuote` found in document text) → quality flags → routing by the Split Register → QA sampling (blind entry).
- **Review UI:** document left, fields right, flagged reasons with the source snippet, reason codes, keyboard shortcuts, time logging.
- **Codification:** repeated corrections with codifiable reason codes → proposed rule in the Rule Inbox → team approves → applied in the next episode; a rule that regresses on QA is auto-suspended.
- **Metrics:** A→B (a1–a3), B→A (b1–b3), reinforcement = min, 2×2 with an episode trail; STP and automation error rate side by side; drift banner.
- **Modes:**
  - Guided (2 episodes)
  - Autoplay compare ("Rubber-stamp team" vs "Coupled team", seeded deterministic simulation)
  - Live single-document extraction (rate-limited)
- **Labels:** "own log-based operationalization; illustrative".

## 10. Presets (golden cases)

Committed as JSON (intake + confirmed decomposition + recorded narration). Golden expectations, asserted by tests:

| Slug | Org | Expected tier | Verdict | Must trigger | Must NOT trigger |
|---|---|---|---|---|---|
| `clinical-referral-triage` | bc_health_authority, sector health_care, pattern clinical_triage, health data, us_or_global_api, recommends | III | Go with conditions | BC-FIPPA-01, BC-FIPPA-XB, HC-SAMD-01, FED-DADM-HITL, VC-GENAI-MGR | BC-PIPA-01 |
| `contract-clause-review` | bc_private, sector other, customer_pi, us_or_global_api, recommends | II | Go with conditions | BC-PIPA-01, FED-PIPEDA-XB, FED-OPC-VENDOR, FED-C36-XB (PROPOSED, info) | HC-SAMD-01 |
| `hiring-and-sentiment` | bc_private, patterns hiring_selection + performance_management, employee_hr, decides_alone, monitorsEmployees | **pinned in Phase 1** (III or IV; recorded in ADR-0004, then asserted exactly) | **Redesign** | BC-PIPA-EMP, BC-PIPA-MON (blocker), BC-HRC-01, FED-C36-ADM (PROPOSED, info) | BC-FIPPA-01 |
| `claims-document-intake` | bc_crown_corp, sector insurance, pattern claims_eligibility, health + customer_pi, us_or_global_api, recommends | II | Go with conditions | BC-FIPPA-01, BC-FIPPA-XB, INS-FAIR | HC-SAMD-01 |

All presets use fictional organizations. Preset copy must explain *why* the verdict is what it is in ≤ 3 sentences. Golden tiers are asserted **exactly** (ADR-0004).

**Edge goldens (Phase 1, engine-only, no UI):** in addition to the presets, `tests/golden/` covers at least: federal institution with an administrative decision (FED-DADM-01, in-scope GOVERNMENT_POLICY), OSFI-regulated bank (OSFI-E23, INS-OSFI-GENAI where generative), Quebec residents with an exclusively automated decision (QC-L25-121), crisis flag (temporary centralization note), low readiness (gradual exchange ramp), no personal data (Go; no privacy rules), Ontario hiring with ≥ 25 employees (ON-ESA-AI), ambient scribe in a health authority (BC-OIPC-SCRIBE).

## 11. Export

- **Charter (Markdown + print stylesheet):** one page, A4/Letter.
  - Header: Splitline, case title, date, tier, verdict.
  - Body: conditions, split summary, three levers with guardrails and costs, 90-day plan, KPIs, triggered rules with status and sources.
  - Footer: disclaimer and the Splitline URL.
- **Inventory record (JSON), ISO/IEC 42001-style:** `useCaseId, title, owner(placeholder), orgType, aiType, aiDecisionRole, dataCategories, hosting, indicativeTier, verdict, triggeredRuleIds, splitReviewCadence, nextReviewDate, createdAt, engineVersion, ruleCatalogueVersion`.

## 12. Non-functional requirements

- **Performance:** presets render without API calls; engine recompute < 100 ms; Lighthouse performance ≥ 90 on `/` and `/preset/*`.
- **Accessibility:** WCAG 2.2 AA (`docs/research/06_*` §6); axe has zero serious or critical violations on all routes.
- **Privacy:**
  - no personal data accepted (banner + manual review of copy);
  - no request bodies logged;
  - cookieless analytics (Vercel Web Analytics with custom events: `preset_open`, `charter_export`, `lab_autoplay`, `live_run`).
- **Security:** API key server-only; no user uploads; dependency audit in CI.
- **Privacy (share links):** structured data only, never the free-text description (§4, ADR-0008).
- **Content:** Canadian English (`06_*` §5); legal microcopy rules (`01_*` §0); every page footer: "Indicative triage, not legal advice." Every results view and the charter end with the long form: "Indicative triage only, not legal advice. Confirm with your privacy office or counsel."
- **Cost:** live runs are a few cents each; Anthropic spend limit set in the Console; `LIVE_MODE_ENABLED` kill switch.

## 13. Tech stack

Next.js 16.4 (App Router, TypeScript strict + `noUncheckedIndexedAccess`) · pnpm 12 · Node 24 LTS (`.nvmrc`; CI and Vercel) · Tailwind CSS 4 · lucide-react · Zod 4 · @anthropic-ai/sdk · @upstash/ratelimit + @upstash/redis · @vercel/analytics · Vitest · Playwright + @axe-core/playwright · hand-built SVG charts. Hosting: Vercel (Hobby; personal, non-commercial portfolio) on a `*.vercel.app` subdomain for launch (ADR-0010). Claude Code hooks are Node scripts (ADR-0011).

Env: `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `LIVE_MODE_ENABLED`, `DAILY_LIVE_RUN_CAP`, `NEXT_PUBLIC_SITE_URL`.

## 14. Decisions from the spec interview (2026-11-20)

| # | Question | Decision | ADR |
|---|---|---|---|
| 1 | Thesis permission | Verbal OK from Prof. König: name the thesis and use Table 5 wording. Keep the paraphrase switch; **written confirmation required before M3 launch**. | 0009 |
| 2 | Tier weights | Calibrate within ±1 point per weight, AIA thresholds fixed; stop and ask if a golden still misses. Mitigation checkboxes, derived reversibility with override, derived scale factor. Final weights in Phase 1. | 0004 |
| 3 | Lab size | 2 episodes × 8 documents guided; autoplay 6 episodes per team; ~30 documents. | 0009 |
| 4 | `/sources` | Main nav item "Governance Map". | 0010 |
| 5 | Visual direction | **Deferred to Phase 3** (Claude Design); recorded in ADR-0005. | 0010 → 0005 |
| 6 | Domain | `*.vercel.app` for launch; custom domain optional later. | 0010 |
| 7 | Author presence | Small footer credit + "About the author" card on `/about`; none on `/`. | 0010 |
| 8 | Facts missing from the intake | New `sector` and `useCasePatterns` (user-ticked; LLM may only suggest). | 0006 |
| 9 | LLM attributes feeding the tier | Consequential floor blocks confirm; highlighted rows; rationale names the subtask. | 0006 |
| 10 | Status vs severity | Severity cap by status; PROPOSED/VOLUNTARY/REFERENCE are info. Evaluation order fixed. | 0007 |
| 11 | Top 3 conditions | Severity → bindingness → tier-factor match → catalogue order. | 0007 |
| 12 | "Sensitive" PI | Tiered: health/biometric/children/financial = action; other PI = info "assess". | 0007 |
| 13 | Hosting "unsure" | Treated as outside Canada, with a "confirm region" action. | 0007 |
| 14 | Pulse role selector | Context only; one respondent answers all 9. | 0009 |
| 15 | Share link | Structured data only, no free text. | 0008 |
| 16 | Live budget | Decompose = 1 run (narrate free per case token); Lab extract 3/IP/h; shared daily cap 100. | 0008 |

**Explicitly deferred:**
- Visual direction → Phase 3, ADR-0005.
- Hiring preset exact tier → Phase 1 calibration, ADR-0004.
- Written thesis permission → before M3, ADR-0009.

## 15. Changes since v0.9
- §4: main navigation; "Governance Map"; share link without free text; author placement.
- §5: `sector`, `useCasePatterns`, `mitigations`, `reversibilityOverride`.
- §6: `suggestedUseCasePatterns`; consequential floor; row highlighting.
- §7.1: evaluation order; severity cap by status; sensitive-PI tiers; `unsure` hosting.
- §7.2: reversibility default and scale derivation; mitigation rule (≥ 4 of 5); exact level formula; calibration bounds.
- §7.3: verdict on effective severity; top-3 ranking.
- §7.4: precedence of heuristic vs tier override.
- §7.7: verbatim/paraphrased switch; role selector = context.
- §8: statute lexicon for the guard; run accounting.
- §9: Lab size.
- §10: patterns and sectors per preset; hiring tier pinned in Phase 1; exact assertions; edge goldens.
- §12–13: long-form disclaimer; versions; launch host; hooks.
