# Splitline: Product Specification

**Version:** 1.1 (manager copy pass, ADR-0018; v1.0 locked after the Phase 0 interview) · **Date:** 2026-11-26 · **Owner:** Julius Wölki
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
| `/about` | Thesis in 150 words, limits (incl. the scope disclosure below), an "About the author" card |

**Thesis scope disclosure (`02_*` §1.9):** `/about`, the Operating model tab, the Pulse result and the Lab dashboard each say: "The thesis propositions are untested. The thesis model is firm-level; Splitline applies it at unit and use-case level, following Table 5 and the task-episode measure (Section 6.4)."

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
  genAiToolType?: "public_tool" | "approved_enterprise" | "direct_api"; // advanced; shown when aiType = generative_llm (BC-GOV-GENAI)
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
  status: RuleStatus;              // status inside the rule's scope
  effectiveDate?: string;          // ISO; REQUIRED when status = IN_FORCE_FUTURE (Zod refinement)
  draft?: { consultationEnds?: string }; // REGULATOR_GUIDANCE still in draft (e.g. FED-OPC-VENDOR)
  inScope?: (c: CaseFacts) => boolean;   // who the instrument binds or addresses; default: always
  statusWhenOutOfScope?: RuleStatus;     // e.g. GOVERNMENT_POLICY → REFERENCE outside federal institutions
  scopeLabel?: string;             // e.g. "federal institutions", used in "Mandatory for <scope>; reference elsewhere"
  appliesWhen: (c: CaseFacts) => boolean;
  severity: (c: CaseFacts) => Severity;
  consideration: string;           // plain-language why
  actionsToConsider: string[];
  ownerRole?: string;              // likely owner role for planning (ADR-0018), e.g. "Privacy office"; never a legal duty
  effort?: "small" | "medium" | "large"; // rough effort band for planning (ADR-0018)
  sources: Array<{ label: string; url: string }>;
  lastVerified: string;            // ISO date
}
interface TriggeredRule {
  ruleId: string;
  effectiveStatus: RuleStatus;   // status, or statusWhenOutOfScope when inScope(c) is false
  severity: Severity;            // effective severity after the cap
  matchedFacts: string[];
}
```
- Rules live as data in `src/content/rules/` (one file per jurisdiction). The catalogue starts from `docs/research/01_*`, section 3.
- `matchedFacts` lists the intake values that triggered the rule (shown in RuleCard as "Why this applies").
- **Planning metadata (ADR-0018):** every catalogue rule has `ownerRole` and `effort` (catalogue test). They are planning aids shown as "Likely owner" and "Rough effort" with the note "Owners and effort are rough planning estimates, not legal advice. Confirm with your privacy office or counsel." They never change triggers, severity or the verdict. Effort bands: small (days), medium (1–3 weeks), large (a month or more).

**Evaluation order (ADR-0007):** `IntakeInput` + confirmed `Decomposition` → `CaseFacts` → **tier** (§7.2) → **rules** (predicates may read the tier, e.g. `FED-DADM-HITL`) → **severity cap** → **verdict** (§7.3) → operating model (§7.4) → rollout (§7.5). The tier never reads rule results, so there is no cycle.

**Effective status (ADR-0012):** `effectiveStatus = inScope(c) ? status : (statusWhenOutOfScope ?? "REFERENCE")`. The cap and the UI label both use the effective status. Example: INS-FAIR is REGULATOR_GUIDANCE for BC-authorized private insurers, but REFERENCE for the fictional Crown insurer in the claims preset.

**Severity cap by effective status (ADR-0007), enforced in code and by a test:**

| Effective status | Max severity | UI label |
|---|---|---|
| `IN_FORCE` | blocker | "Applies" |
| `IN_FORCE_FUTURE` | blocker | "Applies from <effectiveDate>" |
| `GOVERNMENT_POLICY` (in scope) | blocker | "Mandatory for <scopeLabel>" |
| `REGULATOR_GUIDANCE` (final) | blocker (e.g. `BC-PIPA-MON`) | "Regulator expects" |
| `REGULATOR_GUIDANCE` with `draft` | **action** | "Regulator draft (consultation until <date>)" |
| `PROPOSED` | **info** | "Prepare for (proposed)" |
| `VOLUNTARY` | **info** | "Good practice" |
| `REFERENCE` | **info** | "Reference framework" |
| `GOVERNMENT_POLICY` out of scope (shown as REFERENCE) | **info** | "Mandatory for <scopeLabel>; reference elsewhere" |

`effectiveSeverity = min(rule.severity(facts), cap(effectiveStatus, draft))`. A PROPOSED bill can never change the verdict, and a draft can never block.

**Sensitive personal information (`BC-FIPPA-XB`, ADR-0007):** `health`, `biometric`, `children`, `financial` → triggers as `action`, worded "likely sensitive (Splitline heuristic)". The regulation itself names no categories. Any other personal category (`customer_pi`, `employee_hr`) → triggers as `info`: "Assess whether this information is sensitive (B.C. Reg. 294/2021 does not define it). If it is, a supplementary assessment (PIA Part 4) and a risk-based decision by the head of the public body are needed." Both tiers keep the action "Assess the foreign legal framework and reasonable security (FIPPA s. 30)", because s. 30 applies to any disclosure outside Canada. `no_personal` alone → does not trigger.

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

**Top 3 conditions (ADR-0007):** rank triggered rules with effective severity ≥ action by (1) severity (blocker > action), (2) bindingness of the effective status (IN_FORCE > in-scope GOVERNMENT_POLICY > IN_FORCE_FUTURE > REGULATOR_GUIDANCE > draft guidance), (3) whether `matchedFacts` include one of the top 3 tier factors, (4) catalogue order. Fully deterministic.

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
  isStartingSplit: true;  // always shown as "Starting split: the split will move" (02_* §3.2)
  nextReviewDate: string; // ISO; computed from an injected "today" + cadence (no Date.now() in the engine)
  splitReviewCadence: "monthly" | "bimonthly" | "quarterly";
  levers: [LeverCard, LeverCard, LeverCard];
  driftCheck: { ok: boolean; missing: Array<"augmentation_value" | "learning_loop">; suggestedKpis: string[] };
  scopeNotes: string[];   // e.g. central guardrails for codifiable + tier ≥ III; crisis reversal
  costEstimates: CostEstimate[]; // ADR-0018: one per lever, plus "review" when people check AI output
}
interface CostEstimate { topic: "decision_rights" | "coordination" | "exchange" | "review"; lines: string[] }
```
- Split heuristic, lever settings, cadence and drift check follow `02_*` §3 exactly.
- **Two-layer language (ADR-0018):** the workspace shows manager terms; thesis terms sit in a collapsible "Research basis" on each lever card, under "What it costs you" and at the end of the Operating model tab.
  - Owner labels map 1:1 to `SplitOwner`: `machine` → "AI does it (spot-checked)"; `machine_review` → "AI drafts, a person checks and signs off"; `human` → "A person does it (AI may assist)". The thesis labels (Machine / Machine + human review / Human) appear in Research basis.
  - Lever names: decision rights → "Who decides what the AI does"; coordination → "How the team adjusts the split, and how often"; exchange → "How your experts and the AI team learn from each other". Reinforcement → "Is the AI making your people better, and your people making the AI better?", with the minimum rule stated in plain words ("the weaker direction sets the result"); min(A→B, B→A) in Research basis.
  - The scope disclosure is a quiet, always-visible plain note at the end of the Operating model tab; the verbatim disclosure sits in its Research basis.
- **Cost estimates (ADR-0018):** `costEstimates` translate each lever's direct cost (`directCost`, thesis Table 4, kept unchanged) into rough operational terms, derived deterministically from `teamSetup`, `readiness`, the crisis flag, the scope switch, the review cadence and the starting split (machine steps → no straight-through processing before Day 61; `machine_review` steps grouped by volume → reviewer time; `human` steps). Each lever always shows its direct cost in plain words ("Direct cost: …", `DIRECT_COST_PLAIN`, the Table 4 cost restated), its guardrail ("Keep in place") and ≥ 1 case line. Case lines are labelled as Splitline estimates with the note "Estimates are Splitline's own rough figures, not findings from the thesis. They assume a unit of about 5–15 people; adjust them to your team." The verbatim Table 4 text is in Research basis.
- **IF** tier ≥ III, **THE system SHALL** set every subtask that bears on the consequential decision to `machine_review` or `human`, and the Decision Rights card SHALL require a human final decision (rule `FED-DADM-HITL`). This holds even though `FED-DADM-HITL` is capped at `info` for non-federal organizations: the cap affects the verdict, not the operating model.
  - **Card copy (ADR-0012):** for non-federal organizations, the human final decision is presented as Splitline's design setting, citing "Reference: DADM Appendix C (mandatory for federal institutions only)". It must never read as a legal requirement.
  - **For federal institutions:** the card reads "If your official AIA returns Level III or IV, the Directive requires human intervention points and a human final decision." The indicative tier is never presented as the official AIA level.
- **Precedence when computing the starting split (ADR-0007):** apply the `02_*` §3.2 heuristic first, then the tier override. Here the override only moves owners toward more human control (`machine` → `machine_review` → `human`) and never downgrades `human`. When several heuristic branches match, the most human one wins.
- **The split moves:** later split-review changes (team proposals, Lab split review) may go in either direction, including toward `machine`. Only one floor holds: at tier ≥ III, subtasks that bear on the consequential decision stay at `machine_review` or `human`.
- **Scope switch (`02_*` §1.10, §3.3; ADR-0007):** the switch applies when the case is codifiable **AND** (safety-critical **OR** tier ≥ III).
  - **Codifiable at case level:** every subtask with `consequential = true` has `knowledgeType = codifiable`.
  - **Safety-critical:** any subtask has `errorCost = critical`, **OR** `useCasePatterns` contains `clinical_triage`.
  - **Effect:** the Decision Rights card switches to "central guardrails, local proposals". The team proposes split changes, an accountable owner ratifies them, and a matching `scopeNotes` entry is added.

### 7.5 Rollout (90 days)
Three phases (Days 1–30 Foundation & guardrails; 31–60 Shadow pilot & calibration; 61–90 Controlled scale & audit). Each phase has deliverables, KPIs and gate criteria. Deliverables come from triggered rules (e.g. a PIA) and from the levers (shared platform, standardized base, joint sessions). Each deliverable has an `ownerRole` (ADR-0018): the rule's `ownerRole` for rule deliverables; product owner (decision rights, operating model), product owner with the AI team lead (coordination), and the AI team lead / AI steward / internal AI steward with the vendor (exchange, by team setup). Deliverable text names subtasks by name, never by ID; deliverables from IN_FORCE_FUTURE rules start with "Applies from <date>:". KPIs always include one efficiency, one augmentation-value and one learning-loop KPI.

### 7.6 What-if
Toggles: hosting, AI decision role, Quebec/Ontario affected, crisis, dynamism, customer-facing. **WHEN** a toggle changes, **THE system SHALL** recompute synchronously (< 100 ms) and show diff chips (e.g. "Tier II → III", "+2 rules", "Verdict unchanged").

### 7.7 Reinforcement Pulse
- 9 items (A1–A3, B1–B3, D1–D3) taken from the thesis, Table 5, with citation; 1–7 scale. Item wording sits behind one content switch (`verbatim` | `paraphrased`) until written permission is on file (ADR-0009).
- **Role selector = context only (ADR-0009):** the single respondent answers all 9 items. This is an MVP adaptation of `02_*` §3.7: the formula and the minimum rule are unchanged, but the per-role item assignment is replaced by a single-respondent proxy. The result is labelled **"single-perspective estimate"**, shows the chosen role (augmentation work / AI team / lead), and adds the note "Table 5 intends A items for augmentation staff, B items for the AI team, and D items for both; the other side may see it differently."
- **Mandatory footnote (verbatim, `02_*` §3.7):** "Illustrative instrument from a conceptual thesis; not psychometrically validated." This is in addition to the short label "illustrative, not validated".
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

- **Scenario:** fictional "Cascadia Public Auto" receipt reimbursement. All data synthetic and generated by `scripts/generate-synthetic-docs.ts` (ground truth JSON → HTML → PNG/PDF via Playwright).
- **Size (ADR-0009):** a corpus of **48 documents = 6 disjoint episodes × 8**, with the type mix from `05_*` §2 in every episode. Guided mode = episodes 1–2 (≈ 2 minutes). Autoplay compare runs both teams over the same 6 episodes, so the two trails diverge visibly.
- **No document reuse:** every episode is disjoint, so a codified rule is always evaluated (b1, b3, QA) on documents it was not derived from. This guards against superstitious learning (`05_*` §5).
- **Guided mode** has one between-episode change, so its dashboard is labelled "single-step change" and is not shown as a trend. Trails appear only in autoplay.
- **Pre-recorded model runs:** `scripts/record-lab-runs.ts` runs Claude once over all documents and commits the outputs (`src/content/lab/recorded/*.json`) together with model ID and date.
- **Pipeline (pure TS):** validation rules → grounding check (`sourceQuote` found in document text) → quality flags → routing by the Split Register → QA sampling (blind entry).
- **Review UI:** document left, fields right, flagged reasons with the source snippet, reason codes, keyboard shortcuts, time logging.
- **Codification:** repeated corrections with codifiable reason codes → proposed rule in the Rule Inbox → team approves → applied in the next episode; a rule that regresses on QA is auto-suspended.
- **Metrics:** A→B (a1–a3), B→A (b1–b3), reinforcement = min, 2×2 with an episode trail; STP and automation error rate side by side; drift banner.
- **Modes:**
  - Guided (2 episodes)
  - Autoplay compare ("Rubber-stamp team" vs "Coupled team", seeded deterministic simulation)
  - Live single-document extraction (rate-limited)
- **Labels:** "own log-based operationalization; illustrative, not validated", plus the info-icon text from `05_*` §6: "Illustrative log-based proxy derived from the thesis's task-episode measure; not validated."

## 10. Presets (golden cases)

Committed as JSON (intake + confirmed decomposition + recorded narration). Golden expectations, asserted by tests:

| Slug | Org | Expected tier | Verdict | Must trigger | Must NOT trigger |
|---|---|---|---|---|---|
| `clinical-referral-triage` | bc_health_authority, sector health_care, pattern clinical_triage, generative_llm, health data, us_or_global_api, recommends | III | Go with conditions | BC-FIPPA-01, BC-FIPPA-XB, HC-SAMD-01, FED-DADM-HITL (REFERENCE, info), VC-GENAI-MGR | BC-PIPA-01, FED-OPC-VENDOR as REGULATOR_GUIDANCE (public body → REFERENCE only) |
| `contract-clause-review` | bc_private, sector other, generative_llm, customer_pi, us_or_global_api, recommends | II | Go with conditions | BC-PIPA-01, FED-PIPEDA-XB, FED-OPC-VENDOR (draft, ≤ action), FED-C36-XB (PROPOSED, info) | HC-SAMD-01 |
| `hiring-and-sentiment` | bc_private, businessFunction hr, patterns hiring_selection + performance_management, classical_ml, employee_hr, decides_alone, monitorsEmployees | **pinned in Phase 1** (III or IV; recorded in ADR-0004, then asserted exactly) | **Redesign** | BC-PIPA-EMP, BC-PIPA-MON (blocker), BC-HRC-01 | BC-FIPPA-01, FED-C36-ADM (provincial employer; ADR-0012) |
| `claims-document-intake` | bc_crown_corp, sector insurance, pattern claims_eligibility, generative_llm, health + customer_pi, us_or_global_api, recommends | II | Go with conditions | BC-FIPPA-01, BC-FIPPA-XB, INS-FAIR (REFERENCE for a Crown insurer, info), BC-HRC-01 | HC-SAMD-01 |

All presets use fictional organizations. Preset copy must explain *why* the verdict is what it is in ≤ 3 sentences. Golden tiers are asserted **exactly** (ADR-0004).

**Edge goldens (Phase 1, engine-only, no UI):** in addition to the presets, `tests/golden/` covers at least: federal institution with an administrative decision (FED-DADM-01, in-scope GOVERNMENT_POLICY), OSFI-regulated bank (OSFI-E23, INS-OSFI-GENAI where generative), Quebec residents with an exclusively automated decision (QC-L25-121), crisis flag (temporary centralization note), low readiness (gradual exchange ramp), no personal data (Go; no privacy rules), Ontario hiring with ≥ 25 employees (ON-ESA-AI) and with headcount unset (info "confirm headcount"), ambient scribe in a health authority (BC-OIPC-SCRIBE), BC ministry with `genAiToolType = public_tool` vs `approved_enterprise` (BC-GOV-GENAI triggers only for the former), Quebec `decides_with_review` without `human_final_decision` (QC-L25-121 at info: "ensure the review is meaningful"). Rule predicates: ADR-0012.

## 11. Export

- **Charter (Markdown + print stylesheet):** one page, A4/Letter.
  - Header: Splitline, case title, date, tier, verdict.
  - Body: conditions with likely owner and rough effort, split summary in plain owner labels, three levers with guardrails, cost estimates and the Table 4 direct cost, 90-day plan, KPIs, triggered rules with effective status, sources and last-verified date.
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

Next.js 16.4 (App Router, TypeScript strict + `noUncheckedIndexedAccess`) · pnpm 12 · Node 24 LTS (`.nvmrc`; CI and Vercel) · Tailwind CSS 4 · **shadcn/ui on Base UI** (restyled with our tokens, never the default look) · **Sonner** (toasts) · **NumberFlow** (`@number-flow/react`, animated tier/score changes, respects `prefers-reduced-motion`) · lucide-react · Zod 4 · @anthropic-ai/sdk · @upstash/ratelimit + @upstash/redis · @vercel/analytics · Vitest · Playwright + @axe-core/playwright · hand-built SVG charts. Hosting: Vercel (Hobby; personal, non-commercial portfolio) on a `*.vercel.app` subdomain for launch (ADR-0010). Claude Code hooks are Node scripts (ADR-0011).

**UI libraries (ADR-0013):**
- **Allowed:** shadcn/ui (Base UI), Sonner, NumberFlow.
- **Optional later:** shadcn Drawer (Vaul) for the mobile What-if drawer; shadcn Command (cmdk) for a ⌘K palette.
- **Not allowed:** Radix as a separate dependency, Magic UI, Aceternity, RareUI, Beautiful UI, 21st.dev components, or any decorative effect library.

Env: `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `LIVE_MODE_ENABLED`, `DAILY_LIVE_RUN_CAP`, `NEXT_PUBLIC_SITE_URL`.

## 14. Decisions from the spec interview (2026-11-20)

| # | Question | Decision | ADR |
|---|---|---|---|
| 1 | Thesis permission | Verbal OK from Prof. König: name the thesis and use Table 5 wording. Keep the paraphrase switch; **written confirmation required before M3 launch**. | 0009 |
| 2 | Tier weights | Calibrate within ±1 point per weight, AIA thresholds fixed; stop and ask if a golden still misses. Mitigation checkboxes, derived reversibility with override, derived scale factor. Final weights in Phase 1. | 0004 |
| 3 | Lab size | 2 episodes × 8 documents guided; autoplay 6 episodes per team; corpus of 48 documents in disjoint episodes (no reuse). | 0009 |
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
| 14 | Pulse role selector | Context only; one respondent answers all 9; result labelled "single-perspective estimate" (MVP adaptation of `02_*` §3.7). | 0009 |
| 15 | Share link | Structured data only, no free text. | 0008 |
| 16 | Live budget | Decompose = 1 run (narrate free per case token); Lab extract 3/IP/h; shared daily cap 100. | 0008 |

**Explicitly deferred:**
- Visual direction → Phase 3, ADR-0005.
- Hiring preset exact tier → Phase 1 calibration, ADR-0004.
- Written thesis permission → before M3, ADR-0009.

## 15. Changes since v0.9

**v1.1 (2026-11-26, ADR-0018, manager copy pass):** §7.1 rule `ownerRole`/`effort`; §7.4 two-layer language, plain owner labels, `costEstimates`; §7.5 `Deliverable.ownerRole`; §11 charter content. The tier rationale names consequential steps without IDs and lists the ticked mitigations.

- §4: main navigation; "Governance Map"; share link without free text; author placement.
- §5: `sector`, `useCasePatterns`, `mitigations`, `reversibilityOverride`.
- §6: `suggestedUseCasePatterns`; consequential floor; row highlighting.
- §7.1: evaluation order; severity cap by status; sensitive-PI tiers; `unsure` hosting.
- §7.2: reversibility default and scale derivation; mitigation rule (≥ 4 of 5); exact level formula; calibration bounds.
- §7.3: verdict on effective severity; top-3 ranking.
- §4: thesis scope disclosure.
- §7.4: `isStartingSplit`, `nextReviewDate`; starting-split precedence vs the moving split; scope switch definition.
- §7.7: verbatim/paraphrased switch; role selector = context ("single-perspective estimate"); verbatim footnote.
- §8: statute lexicon for the guard; run accounting.
- §9: Lab corpus of 48 docs in disjoint episodes; "single-step change" in guided mode; full honesty label.
- §10: patterns and sectors per preset; hiring tier pinned in Phase 1; exact assertions; edge goldens.
- §12–13: long-form disclaimer; versions; launch host; hooks.
- After review (`legal-content-reviewer`, ADR-0012): `RuleDefinition` scope/effective status/draft; label table; ranking order; FIPPA-XB wording; `genAiToolType`; golden rows state `businessFunction`/`aiType`; BC-HRC-01 added to claims; FED-C36-ADM moved to must-NOT for hiring; charter shows last-verified dates.
- After review (`thesis-fidelity-reviewer`): Pulse single-perspective label and verbatim footnote; Lab label; scope disclosure; moving split; scope switch; 48-document corpus.
