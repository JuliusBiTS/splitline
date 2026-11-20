# ADR-0016: Operating-model gap fills (split, scope switch, rollout, what-if, Pulse)

- **Status:** Accepted · **Date:** 2026-11-20

## Context
Phase 2 implements SPEC §7.4–7.7 and `02_*` §3 as pure functions in `src/engine/`. A few points are open in the binding text:
- `02_*` §3.2 distinguishes a step that *bears on* the consequential decision (machine + review) from a step that *is* the decision at tier IV (human), but does not say how to tell them apart.
- Some subtasks match no §3.2 branch (for example: codifiable, medium error cost, medium volume, not consequential).
- §3.2 names `errorCost = high` for the review branch; `critical` steps that are codifiable match no branch.
- SPEC §7.4 defines a case as codifiable when every consequential subtask is codifiable. With no consequential subtasks that is vacuously true.
- `02_*` §3.5 names the exchange rhythm for a separate AI team and for an embedded team, but not for a vendor-run system.
- SPEC §7.5–7.7 give no output types for the rollout, the what-if diff or the Pulse result.
- `nextReviewDate` needs a "today" without `Date.now()` in the engine.

The lever content (guardrail, direct cost, signal to track, warning sign) is taken from thesis Table 4 ("A playbook for the three design levers"). The Table 4 note says the signals and warning signs are illustrative.

## Decision
1. **"Is the decision" (Julius, 2026-11-20):** a subtask *is* the consequential decision when `consequential = true` **and** `judgmentIntensity = high`. At tier IV such a step starts at `human`. Other consequential steps bear on the decision and start at `machine_review`.
2. **No branch matches (Julius, 2026-11-20):** the starting owner is `machine_review`. The reason says that no heuristic branch matched and that the split review may move the step to `machine`.
3. **Critical error cost:** the review branch reads "errorCost ≥ high", so a codifiable `critical` step starts at `machine_review` (a tacit `critical` step is `human` per §3.2).
4. **Codifiable at case level with no consequential subtask:** fall back to "every subtask is codifiable". This avoids switching to central guardrails on a vacuous truth.
5. **Vendor-run exchange:** regular joint sessions with the vendor's delivery team, plus an internal AI steward who owns the correction channel. This applies the §3.5 logic (joint rhythm, correction channel) to the missing case.
6. **Output types:** `RolloutPlan`, `WhatIfToggles`/`WhatIfDiff` and `PulseInput`/`PulseResult` are Zod schemas in `src/engine/types.ts`.
   - Rollout deliverables carry a source tag (rule ID, lever or model), so the UI can link them.
   - Blocker rules gate the move from Days 1–30 to the shadow pilot on their redesign path.
   - The rollout KPI set always has one efficiency, one augmentation-value and one learning-loop KPI: the user's KPI where the drift lexicon classifies one, else a suggested one.
7. **Pulse quadrants (`02_*` §3.7):** both > 0 → virtuous; one on the positive half-axis (= 0 while the other > 0) → one-way limit (reinforcement 0); exactly one ≤ 0 otherwise → one-sided; both ≤ 0 → vicious (including the origin). The lagging driver is the lowest D item; ties return all tied drivers in D1, D2, D3 order. The driver check is marked relevant when the reinforcement is ≤ 0 (Table 5: "if the two scores show a problem").
8. **Injected date:** `computeCase(intake, decomposition, { today, catalogue? })`. `today` is a required ISO date. The cadence adds 1, 2 or 3 calendar months and clamps the day to the month's end (31 Jan + 1 month → 28/29 Feb).
9. **Drift lexicon:** KPIs are user-typed strings, so they are classified with a fixed, tested keyword list. This is not a rule trigger, so ADR-0006 (no rule facts from free text) is unaffected.

## Consequences
- Golden split owners are asserted per preset in `tests/golden/expectations.ts`.
- `ENGINE_VERSION` moves to 0.2.0.
- The Table 4 wording was read from thesis draft v42; `02_*` cites v48. Julius should confirm the wording has not changed.
- Sync SPEC §7.5–7.7 with these types at the next spec revision.
