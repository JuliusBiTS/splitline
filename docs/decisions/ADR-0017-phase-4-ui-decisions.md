# ADR-0017: Phase 4 UI decisions (What-if check, placeholders, lazy engine, as-of date)

- **Status:** Accepted · **Date:** 2026-11-21

## Context
Phase 4 (PLAN) wires the Phase 3 components into the routes of SPEC §4. Six questions came up that SPEC and PLAN don't settle:
- The acceptance check "What-if hosting → in_canada changes the rules count" can't hold for `hiring-and-sentiment`: it is already `hosting: in_canada`, and no hosting value changes its rules (BC PIPA has no cross-border rule, and PIPEDA doesn't reach a provincially regulated employer's staff data).
- Three main-nav routes (`/case/new`, `/lab`, `/pulse`) arrive in Phases 6–7.
- What-if must recompute synchronously (SPEC §7.6), but shipping the rule catalogue in every page's JavaScript costs Lighthouse points.
- "Apply to design" has nowhere to go on a fixed preset.
- VerdictCard shows "how sure", but the engine computes no confidence.
- The engine needs an injected "today" (next split review).

## Decision
1. **What-if acceptance per preset.** For presets hosted outside Canada, e2e asserts that "hosting → In Canada" lowers the rules count (clinical 8→7, contract 7→5, claims 8→7). For `hiring-and-sentiment`, e2e asserts two things:
   - switching hosting to "US or global API" leaves the count at 7, and the drawer shows "No effect on tier, verdict, rules or split";
   - "Quebec residents affected" changes the count (+1, Law 25), which proves the drawer recomputes.
   No rule is made stricter than the law to force a change.
2. **Placeholders.** The main nav keeps the ADR-0010 order. `/case/new`, `/lab` and `/pulse` render a short `noindex` placeholder ("arrives in a later release") that links to the presets. Phases 6–7 replace them.
3. **Lazy engine.** `/preset/[slug]` is prerendered at build time (`generateStaticParams`). It reads `params` inside `<Suspense>`, as Cache Components require. Because the shell streams first, `notFound()` alone would give a soft 404 (`dynamicParams` is unavailable with Cache Components), so `src/proxy.ts` rewrites unknown `/preset/<slug>` requests to a missing path for a real 404 (slug list in `src/content/presets/slugs.ts`, kept in sync by a test). The What-if panel loads `@/engine` and `@/engine/whatif` with dynamic `import()` on first open, then recomputes synchronously on every change.
4. **No Apply on presets.** `WhatIfDrawer.onApply` is optional. Presets show "Presets are fixed. Start your own to keep changes." `/case/[id]` (Phase 6) passes `onApply`.
5. **No confidence line.** `VerdictCard.confidence` is optional and omitted until something deterministic grounds it, because we don't invent a confidence word.
6. **As-of date.** Presets compute with `PRESET_AS_OF = 2026-11-20` (shown as "results as of …"), so builds are reproducible.

Also:
- `LeverCard` now renders `lever.details` (shared platform, override safeguards, the FED-DADM-HITL reference copy), which were previously not shown.
- Every RuleCard links to its Governance Map entry (`/sources#<ruleId>`, ADR-0010).
- Lighthouse runs via `pnpm test:lighthouse` (`scripts/lighthouse.mts`, devDependency `lighthouse`) against the production build. This is tooling, not a UI library (ADR-0013 unaffected).

## Consequences
- The PLAN acceptance line for What-if is read as "changes the rules count where hosting can change it"; the hiring exception is tested, not skipped.
- Phase 6 must replace the placeholders and pass `onApply` for live cases.
- If the engine gains a grounded confidence measure, pass it to `VerdictCard`.
