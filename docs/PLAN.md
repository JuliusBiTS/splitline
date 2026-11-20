# Splitline: Implementation Plan

**Version:** 1.0 · **Date:** 2026-11-20 · Read with `docs/SPEC.md`.

## How to use this plan
- One phase = one or more **fresh Claude Code sessions**. Start each in plan mode, using the start prompt in `START-HIER.md`.
- A phase is done only when **every acceptance check passes and the evidence is shown** (command output, screenshots). "Looks done" is not done.
- Before closing a phase, run the `plan-reviewer` subagent against this file; fix correctness gaps only.
- Tick boxes in this file as you go and commit with the message `phase-N: <summary>`.
- If something in SPEC turns out wrong, stop, propose the SPEC change, and record an ADR in `docs/decisions/`.

## Milestones (target calendar, adjust to the thesis submission)
| Milestone | Content | Target |
|---|---|---|
| **M0 Spec locked** | Phase 0 done, open questions answered | first week of Dec 2026 |
| **M1 Core live** | Phases 1–6: presets 1–4 (static), live intake, export, Pulse, deployed | ~Dec 23, 2026 |
| **M2 Living Lab** | Phase 7 | ~Jan 15, 2027 |
| **M3 Launch-ready** | Phases 8–9: hardening, README, Loom, case study | ~Jan 29, 2027 |

Phase 3 (design) runs in parallel to Phases 1–2. Phases 1–2 have no UI dependency.

---

## Phase 0: Setup & spec lock
**Goal:** a reproducible repo, CI, and a spec without open questions.
- [x] Scaffold Next.js 16 (App Router, TS strict, Tailwind, ESLint) with pnpm; Node 24 LTS (`.nvmrc`).
- [x] Add Vitest, Playwright, `@axe-core/playwright`, Zod, `@anthropic-ai/sdk`, `@upstash/ratelimit`, `@upstash/redis`, `@vercel/analytics`, `lucide-react`.
- [x] Scripts:
  - `typecheck`, `lint`, `test` (Vitest run), `test:e2e` (Playwright), `test:a11y`
  - `eval:engine` (golden cases), `eval:llm` (live, manual)
  - `verify` = typecheck + lint + test
- [x] GitHub Actions: `pnpm verify` + `pnpm test:e2e` on PRs (plus `test:a11y`, `eval:engine` and a dependency audit).
- [x] `.env.example` with all vars from SPEC §13; `.gitignore` covers `.env*` except the example.
- [x] Make the hooks work: ported to Node scripts (ADR-0011) because bash hooks in exec form never ran on Windows; verified live (a Write to `.env.local` is blocked).
- [x] Run `next dev` once so Next writes `AGENTS.md`; confirm that `CLAUDE.md` imports it.
- [x] **Spec interview** (plan mode, AskUserQuestion): resolve SPEC §14; update SPEC to v1.0; write ADR-0004 (tier weights approach). Also ADR-0006–0011.
- [x] Push to `JuliusBiTS/splitline` and open the first PR; CI green (PR #1: verify, e2e + a11y, audit).

**Acceptance**
- `pnpm verify` exits 0 on the empty app; CI is green on the first PR.
- `SPEC.md` has no "Open questions" left (or they are explicitly deferred with an ADR).

---

## Phase 1: Domain types & rules engine
**Goal:** the deterministic core that produces tier, triggered rules and verdict from `CaseFacts`.
- [ ] `src/engine/types.ts`: all types from SPEC §5–7 plus Zod schemas (single source; types inferred from Zod).
- [ ] `src/engine/facts.ts`: IntakeInput + confirmed Decomposition → `CaseFacts` (derived flags: sensitiveData, crossBorder, consequentialPresent, reversibility …).
- [ ] `src/content/rules/{federal,bc,on,qc,intl}.ts`: implement every rule from `docs/research/01_*` §3 with status, sources and lastVerified (use the `add-legal-rule` skill).
- [ ] `src/engine/rules.ts`: evaluate rules → `TriggeredRule[]` with `matchedFacts`.
- [ ] `src/engine/tier.ts`: scoring per SPEC §7.2; calibrate weights on the golden cases; write ADR-0004 with the final weights.
- [ ] `src/engine/verdict.ts`: per SPEC §7.3.
- [ ] `src/content/presets/*.json`: intake + decomposition for the 4 presets (decompositions hand-written now, replaced by recorded ones in Phase 5).
- [ ] `tests/golden/*.test.ts`: assertions from SPEC §10 (tier, verdict, must / must-not rules).
- [ ] Rule coverage test: every rule has ≥ 1 test where it triggers and ≥ 1 where it doesn't.

**Acceptance**
- `pnpm test` passes. `pnpm eval:engine` prints a table showing 4/4 golden cases matching.
- Every `RuleDefinition` has a non-empty `sources` list and a `lastVerified` date (enforced by a test).
- No rule text contains "compliant", "must comply" or "legal advice" except the disclaimer (enforced by a test).
- `legal-content-reviewer` subagent reports no status or wording violations.

---

## Phase 2: Operating model, rollout, what-if, Pulse scoring
**Goal:** the thesis logic as tested pure functions.
- [ ] `src/engine/split.ts`: split heuristic (`02_*` §3.2), with tier ≥ III override (SPEC §7.4).
- [ ] `src/engine/levers.ts`: three LeverCards incl. guardrail, direct cost, monitoring and warning indicators (from thesis Table 4); scope notes (codifiable + regulated → central guardrails; crisis → temporary centralization).
- [ ] `src/engine/cadence.ts` (dynamism → split review cadence) and `src/engine/drift.ts` (KPI coverage check).
- [ ] `src/engine/rollout.ts`: 90-day plan built from triggered rules + levers + KPIs.
- [ ] `src/engine/whatif.ts`: recompute + diff (tier, verdict, rules added/removed).
- [ ] `src/engine/pulse.ts`: scoring, minimum, quadrant, lagging driver → lever.
- [ ] Extend the golden tests: expected split owners for the key subtasks of each preset; the drift check flags the HR preset KPIs.

**Acceptance**
- `pnpm test` passes; engine coverage ≥ 90% lines (`vitest --coverage`).
- A benchmark test shows `computeCase()` + what-if diff < 100 ms on the presets.
- `thesis-fidelity-reviewer` subagent finds no contradiction with `docs/research/02_*` (especially the minimum rule and the guardrails).

---

## Phase 3: Design in Claude Design (parallel to Phases 1–2; you lead)
**Goal:** design system + 5 key screens, handed off to Claude Code.
- [ ] Paste `docs/claude-design-brief.md` into Claude Design; create the design system (tokens, components from `06_*` §3).
- [ ] Screens: Landing with presets · Intake step 3 (Confirm split) · Results Summary · Operating model (Lever cards) · Lab Review + Dashboard. Use real preset content.
- [ ] 5-second test with 3 people + 1 think-aloud; note the findings in `docs/decisions/ADR-0005-design-direction.md`.
- [ ] Hand off to Claude Code (handoff bundle or `/design` import) into `design/` or as tokens + components.

**Acceptance**
- Design tokens exist in code (`src/styles/tokens.css` or the Tailwind theme) and match the design.
- ADR-0005 records the chosen accent colour, type and any changes from the test.

---

## Phase 4: UI shell, presets, sources, self-assessment
**Goal:** a recruiter can open any preset on any device and understand it in 10 seconds.
- [ ] Layout, navigation, footer with disclaimer; component library from the handoff (VerdictCard, StatusBadge, RuleCard, SplitMap, LeverCard, DivergingScoreBar, QuadrantChart, WhatIfDrawer).
- [ ] `/` with the preset gallery; `/preset/[slug]` workspace with tabs Summary · Triage · Operating model · Rollout · Export (statically generated).
- [ ] What-if drawer wired to `whatif.ts`.
- [ ] `/sources` generated from the rule catalogue; `/self-assessment` = Splitline run through its own engine (committed intake); `/about`.
- [ ] Canadian English pass on all copy.

**Acceptance**
- `pnpm test:e2e`: for each preset → open from `/`, the verdict and tier are visible, What-if "hosting → in_canada" changes the rules count; screenshots saved for the PR.
- `pnpm test:a11y`: zero serious or critical axe violations on `/`, `/preset/*`, `/sources`.
- Lighthouse (Playwright or CI) performance ≥ 90 on `/` and one preset page.
- Mobile 375 px screenshots of `/` and one Summary attached as evidence.

---

## Phase 5: LLM layer (decompose, narrate) with guards and evals
**Goal:** live runs that are safe, cheap and graceful when unavailable.
- [ ] `src/llm/client.ts`: model constant, prompt caching, error mapping (429 rate / ramp / spend cap).
- [ ] `src/llm/decompose.ts` and `src/llm/narrate.ts` with Zod schemas + `messages.parse()`; system prompts in `src/llm/prompts/*.md`.
- [ ] Narration guard: only triggered rule IDs or statutes may appear; retry once → template fallback.
- [ ] `src/app/api/*`: route handlers; Upstash rate limit; `LIVE_MODE_ENABLED` and `DAILY_LIVE_RUN_CAP`; no body logging.
- [ ] `scripts/record-presets.ts`: run decompose + narrate for the 4 presets, commit the outputs (model ID + date); presets now use the recorded decompositions.
- [ ] `scripts/eval-llm.ts`: 6 sample intakes × 3 runs → schema-valid rate, required-field completeness, decomposition stability (subtask count ± 1, attribute agreement), guard violations.

**Acceptance**
- Unit tests with a mocked SDK cover: success, schema failure → retry → fallback, 429 with retry-after, `ramp_limit_exceeded`, `enforced_spend_limit_reached` (live mode disabled message).
- `pnpm eval:llm` (manual, real key) report committed in `docs/evals/`: schema-valid 100%, guard violations 0, stability ≥ 80%.
- With `LIVE_MODE_ENABLED=false`, every page still works (e2e).

---

## Phase 6: Live intake, export, Pulse UI, deploy (→ M1)
**Goal:** the full self-serve flow plus the first public deploy.
- [ ] `/case/new` 3-step intake with progressive disclosure, a "don't enter personal info" banner, editable subtask table, manual fallback.
- [ ] `/case/[id]` workspace (same components as presets); `localStorage` persistence + share link (URL hash, compressed).
- [ ] Export: Markdown charter, print stylesheet (one page), inventory JSON.
- [ ] `/pulse`: survey, scoring, 2×2, lagging driver → lever.
- [ ] Vercel deploy, env vars, Upstash, Vercel Analytics custom events.
- [ ] `release-check` skill run before deploy.

**Acceptance**
- e2e: full live path with a mocked API (intake → confirm split → results → export files downloaded and non-empty); Pulse path with fixed answers gives the expected quadrant.
- Playwright PDF snapshot of the charter: fits on one page for all 4 presets.
- Production URL works with live mode off and on; rate limit returns a friendly message after 10 runs (tested against a preview deployment).

---

## Phase 7: Living Lab Lite (→ M2)
**Goal:** the 2-minute demo that shows the thesis in action. Spec: `docs/research/05_*`, SPEC §9.
- [ ] `scripts/generate-synthetic-docs.ts`: ground-truth JSON → HTML templates (≥ 2 layouts per type, handwriting + noise variants) → PNG/PDF. 48 documents = 6 disjoint episodes × 8 (ADR-0009), fictional names only.
- [ ] `scripts/record-lab-runs.ts`: extraction with Claude over all documents → `src/content/lab/recorded/`. Report field accuracy vs ground truth per type (this doubles as the extraction eval).
- [ ] `src/lab/`:
  - validation rules, grounding check, quality flags, router (Split Register), QA sampler;
  - decision log; codification proposer + rule application + auto-suspend;
  - episode metrics (a1–a3, b1–b3, min) and the drift banner.
- [ ] `/lab` UI: Review queue (keyboard-first, reason codes, blind QA entry), Rule inbox, Split register with change log, Dashboard (2×2 trail, STP vs error rate), Autoplay compare (seeded simulation of "Rubber-stamp" vs "Coupled" team), Live single-doc extraction (rate-limited).
- [ ] Info panels: mapping of the metrics to thesis Table 5 + the "own operationalization" label.

**Acceptance**
- Unit tests: metric functions with hand-computed fixtures; routing and codification; auto-suspend after a regression.
- Determinism test: autoplay with a fixed seed gives identical metrics across runs; "Coupled" ends with reinforcement > 0 and "Rubber-stamp" ≤ 0 (assertion).
- e2e: guided mode completes 2 episodes by keyboard only; screenshots attached.
- `thesis-fidelity-reviewer` approves the Lab copy and metric definitions.

---

## Phase 8: Hardening
- [ ] Full a11y pass (axe on all routes + one manual screen-reader run; notes in `docs/evals/a11y.md`).
- [ ] Copy pass: Canadian English, legal microcopy, honesty labels (`07_*` §I).
- [ ] Performance: Lighthouse ≥ 90 on `/`, `/preset/*`, `/lab` (desktop).
- [ ] Security: dependency audit clean (high/critical), no secrets in the repo (secret scan), API routes reject unexpected payloads (Zod).
- [ ] `release-check` skill: C-36 stage, OPC vendor guidance status, OIPC BC news, PIPA Aug-2027 changes → update `lastVerified` dates.

**Acceptance:** `pnpm verify && pnpm test:e2e && pnpm test:a11y` green; `release-check` report committed in `docs/evals/release-YYYY-MM-DD.md`.

---

## Phase 9: Launch & packaging (→ M3)
- [ ] README (structure in `docs/research/03_*` §7) with live link, GIF, architecture diagram (engine vs LLM), thesis summary, limits.
- [ ] 2-minute Loom (English): preset 3 → Lab autoplay → Pulse.
- [ ] One-page case study PDF; 3 LinkedIn posts drafted; CV line updated.
- [ ] Final check from a phone and a laptop on the production URL.

**Acceptance:** README renders on GitHub with a working live link; the Loom link is in the README; the production smoke test (Playwright against the prod URL) is green.

---

## Definition of Done (every phase)
1. All acceptance checks pass, with the evidence pasted in the PR description.
2. `pnpm verify` is green (the Stop hook enforces this locally).
3. No TODOs without an issue link; no skipped tests; no deleted assertions to make tests pass.
4. The relevant reviewer subagent was run and its correctness findings fixed.
5. SPEC/ADR updated if behaviour changed.
