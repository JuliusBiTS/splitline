# Splitline: Product Specification

**Version:** 0.9 (draft for the spec interview) · **Date:** 2026-11-20 · **Owner:** Julius Wölki
**Tagline:** *Design where the machine ends and judgment begins.*

> This spec is the source of truth for *what* to build. `docs/PLAN.md` says *in which order*. `docs/research/*` holds the evidence. If this spec and the research disagree, raise it; do not silently pick one. Section 14 lists open questions for the spec interview.

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
| `/` | Hero (1 line + tagline), preset gallery (4 cards), "Start your own", 30-second how-it-works, footer (About, Sources, Self-assessment) |
| `/case/new` | 3-step intake: **Describe → Context → Confirm split** |
| `/case/[id]` | Workspace tabs: **Summary · Triage · Operating model · Rollout · Export**; What-if drawer |
| `/preset/[slug]` | Same workspace, loaded from committed JSON (no API) |
| `/lab` | Living Lab Lite: Review queue · Rule inbox · Split register · Dashboard · Autoplay compare |
| `/pulse` | Reinforcement Pulse survey (9 items) + result |
| `/sources` | All rules: status, scope, source links, last verified (public "Canada AI Governance Map") |
| `/self-assessment` | Splitline assessed by its own engine |
| `/about` | Thesis in 150 words, limits, author |

Case IDs are client-side (stored in `localStorage` plus a URL-hash share link). No server storage.

## 5. Intake (input model)

Progressive disclosure: step 2 shows 6 essential questions; "More context" reveals the rest.

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
}
```

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
}
```

- **WHEN** the user submits steps 1–2, **THE system SHALL** call `/api/decompose` and show the subtasks as an editable table (step 3).
- **THE system SHALL NOT** run the analysis until the user confirms the subtasks ("Confirm split").
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

### 7.2 Indicative impact tier (AIA-inspired, *not* an official AIA)

Raw impact points (initial calibration; tune so the golden cases hit the expected tiers; record the final weights in an ADR):

| Factor | Values → points |
|---|---|
| AI decision role | informs 1 · recommends 3 · decides_with_review 5 · decides_alone 8 |
| Most consequential subtask | none 0 · consequential 4 |
| Data sensitivity (max) | no_personal 0 · customer_pi 2 · financial 3 · employee_hr 4 · health/biometric/children 5 |
| Affected people | businesses_only 0 · public_customers 2 · employees_applicants 3 · patients 4 |
| Reversibility (derived from function + role) | brief/reversible 0 · short-term 2 · hard to reverse 4 · irreversible 6 |
| Scale/vulnerability (advanced) | 0–3 |
| Customer-facing generative output | +2 |

Maximum = sum of the maxima (computed in code). Mitigation points (human final decision, appeal path, explanation available, pre-deployment testing, monitoring plan): if ≥ 80% of the mitigation maximum, deduct 15% of the raw score (mirrors the AIA mechanic). Level by percentage: **I ≤ 25 · II ≤ 50 · III ≤ 75 · IV > 75**.

**THE system SHALL** show the tier with a rationale listing the top 3 contributing factors and the label "AIA-inspired indicative tier".

### 7.3 Verdict
- **Stop:** a blocker with no redesign path (reserved; none in the MVP catalogue).
- **Redesign:** ≥ 1 blocker with a redesign path (e.g. `BC-PIPA-MON`).
- **Go with conditions:** ≥ 1 `action` and no blockers.
- **Go:** only `info` rules.

Top 3 conditions = highest-severity actions, ranked by tier contribution.

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
- **IF** tier ≥ III, **THE system SHALL** set every subtask that bears on the consequential decision to `machine_review` or `human`, and the Decision Rights card SHALL require a human final decision (rule `FED-DADM-HITL`).

### 7.5 Rollout (90 days)
Three phases (Days 1–30 Foundation & guardrails; 31–60 Shadow pilot & calibration; 61–90 Controlled scale & audit). Each phase has deliverables, KPIs and gate criteria. Deliverables come from triggered rules (e.g. a PIA) and from the levers (shared platform, standardized base, joint sessions). KPIs always include one efficiency, one augmentation-value and one learning-loop KPI.

### 7.6 What-if
Toggles: hosting, AI decision role, Quebec/Ontario affected, crisis, dynamism, customer-facing. **WHEN** a toggle changes, **THE system SHALL** recompute synchronously (< 100 ms) and show diff chips (e.g. "Tier II → III", "+2 rules", "Verdict unchanged").

### 7.7 Reinforcement Pulse
- 9 items (A1–A3, B1–B3, D1–D3), wording adapted from the thesis, Table 5; 1–7 scale; role selector.
- Scoring per `02_*` §3.7.
- Output: 2×2, the minimum highlighted, lagging driver → lever card with guardrail, and the note "illustrative, not validated".
- Single respondent in the MVP; team aggregation is a later feature (would need n ≥ 5 anonymity).

## 8. LLM layer (server-only)

- **Model:** `claude-sonnet-5-5` (pinned in one constant). SDK: `@anthropic-ai/sdk`, `messages.parse()` with `output_config: { format: zodOutputFormat(schema) }`.
- **Schemas:** no `min`/`max`/`minLength` constraints relied upon server-side without a local check; no `oneOf`; `additionalProperties: false`.
- **Prompt caching** on the system prompt and rule context.
- **Endpoints:**
  - `POST /api/decompose`: IntakeInput → Decomposition.
  - `POST /api/narrate`: EngineResult → Narrative `{ executiveSummary, splitNarrative, leverNarratives[3], rolloutNarrative }`. **Guard:** every rule ID or statute name in the text must be in the triggered set; otherwise retry once, then use template text.
  - `POST /api/lab/extract` (live demo only): synthetic document → Extraction (see §9).
- **Injection hygiene:** user text sits in delimited blocks and is declared as data in the system prompt; the output is schema-validated.
- **Resilience:**
  - 429 with `retry-after` → one retry if ≤ 10 s.
  - `ramp_limit_exceeded` → back off.
  - `enforced_spend_limit_reached` → no retry; disable live mode and show cached/manual paths.
- **Rate limiting:** Upstash sliding window, 10 live runs per IP per hour + a global `DAILY_LIVE_RUN_CAP`.

## 9. Living Lab Lite (spec in `docs/research/05_living-lab-design.md`)

- **Scenario:** fictional "Cascadia Public Auto" receipt reimbursement. All data synthetic and generated by `scripts/generate-synthetic-docs.ts` (ground truth JSON → HTML → PNG/PDF via Playwright).
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
| `clinical-referral-triage` | bc_health_authority, health data, us_or_global_api, recommends | III | Go with conditions | BC-FIPPA-01, BC-FIPPA-XB, HC-SAMD-01, FED-DADM-HITL, VC-GENAI-MGR | BC-PIPA-01 |
| `contract-clause-review` | bc_private, customer_pi, us_or_global_api, recommends | II | Go with conditions | BC-PIPA-01, FED-PIPEDA-XB, FED-OPC-VENDOR, FED-C36-XB (PROPOSED) | HC-SAMD-01 |
| `hiring-and-sentiment` | bc_private, employee_hr, decides_alone, monitorsEmployees | III or IV | **Redesign** | BC-PIPA-EMP, BC-PIPA-MON (blocker), BC-HRC-01, FED-C36-ADM | BC-FIPPA-01 |
| `claims-document-intake` | bc_crown_corp, health + customer_pi, us_or_global_api, recommends | II | Go with conditions | BC-FIPPA-01, BC-FIPPA-XB, INS-FAIR | HC-SAMD-01 |

All presets use fictional organizations. Preset copy must explain *why* the verdict is what it is in ≤ 3 sentences.

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
- **Content:** Canadian English (`06_*` §5); legal microcopy rules (`01_*` §0); every page footer: "Indicative triage, not legal advice."
- **Cost:** live runs are a few cents each; Anthropic spend limit set in the Console; `LIVE_MODE_ENABLED` kill switch.

## 13. Tech stack

Next.js 16 (App Router, TypeScript strict) · pnpm · Node 24 LTS · Tailwind CSS · lucide-react · Zod · @anthropic-ai/sdk · @upstash/ratelimit + @upstash/redis · @vercel/analytics · Vitest · Playwright + @axe-core/playwright · hand-built SVG charts. Hosting: Vercel (Hobby; personal, non-commercial portfolio).

Env: `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `LIVE_MODE_ENABLED`, `DAILY_LIVE_RUN_CAP`, `NEXT_PUBLIC_SITE_URL`.

## 14. Open questions for the spec interview

1. Thesis permission: may the tool name the thesis and reproduce Table 5 item wording publicly? (Ask Prof. König.) If not → paraphrased items and "based on unpublished research".
2. Final tier weights: accept the calibration approach in §7.2 or adjust factors?
3. Lab size: 8 or 10 documents per episode; 2 or 3 episodes in guided mode?
4. Should `/sources` be promoted as a standalone "Canada AI Governance Map" in navigation?
5. Visual direction: pick one of the Claude Design options (accent colour, type).
6. Domain: `splitline.<tld>` or a `vercel.app` subdomain for launch?
7. Author presence: how prominent on `/` (small footer credit vs an "About the author" card)?
