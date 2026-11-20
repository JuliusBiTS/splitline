# ADR-0014: Rule variants, matched facts and the floor confirmation

- **Status:** Accepted · **Date:** 2026-11-20

## Context
SPEC §7.1 defines `RuleDefinition` and `TriggeredRule`, but several decisions in ADR-0006, ADR-0007 and ADR-0012 need things those shapes can't express:
- **Case-dependent wording:** BC-FIPPA-XB has two tiers with different text; `hosting = unsure` adds "Confirm the vendor's processing and storage region"; ON-ESA-AI (headcount unset), QC-L25-121 (meaningful review), BC-GOV-GENAI (tool unset) and FED-DADM-HITL (federal vs. reference wording) each need a variant note.
- **`matchedFacts`** must name the intake values behind a rule, and the top-3 ranking needs to know whether those facts overlap a top-3 tier factor.
- **Stop vs. Redesign** (SPEC §7.3) depends on whether a blocker has a redesign path.
- **Consequential floor:** ADR-0006 lets the user confirm that no step is consequential, and that confirmation is shown in the rationale, but the decomposition type has no field for it.
- Two SPEC §10 edge goldens (crisis → temporary centralization note; low readiness → gradual exchange ramp) are operating-model outputs, which arrive in Phase 2.

## Decision
1. `RuleDefinition` (types in `src/engine/types.ts`) gains:
   - `reads: FactKey[]`: the case facts the rule reads. `matchedFacts` renders them with the case's values ("Hosting unknown; assumed outside Canada" for `unsure`), and they drive ranking step 3.
   - `notes?(c)` and `extraActions?(c)`: case-dependent wording and actions.
   - `redesignPath?`: required for any rule that can reach blocker (enforced by a test). A blocker without one gives **Stop**.
2. `TriggeredRule` gains `inScope`, `requestedSeverity`, resolved `notes`, resolved `actions` and `tierFactorMatch`.
3. Any rule that reads `hosting` adds the "Confirm the vendor's processing and storage region" action when hosting is `unsure` (ADR-0007 §5).
4. `ConfirmedDecomposition = Decomposition + confirmedNoConsequential?`. The engine exposes `consequentialFloorBlocks()`; the UI calls it in Phases 4/6.
5. Phase 1 edge goldens for crisis and low readiness assert the facts and that tier and verdict ignore them. Phase 2 adds the scope note and ramp assertions (PLAN Phase 2, "Extend the golden tests").
6. Rule-coverage: REF-AIA-TIER and ISO-42001 always apply, so they can't have a non-triggering case. They are on an explicit always-on list and must trigger on **every** fixture instead.

## Consequences
- Every displayed reason for a rule traces to a field the user set (keeps ADR-0001 and ADR-0006 intact).
- The SPEC §7.1 interface block is a subset of the code type; the code type is the reference. Sync SPEC at the next spec revision.
- Tests: wording ban also runs over resolved notes, actions and matched facts; `redesignPath` is required for blocker-capable rules.
