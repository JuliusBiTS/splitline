# ADR-0009: Thesis attribution, Pulse role handling, Lab size

- **Status:** Accepted · **Date:** 2026-11-20

## Context
SPEC §14 left two questions open:
- May the tool name the thesis and reproduce the Table 5 items?
- How big should the Living Lab be?

The Pulse also had a role selector with no defined effect. Table 5 intends the A items for augmentation staff and the B items for the AI team. The MVP has a single respondent, and min(A, B) needs both directions.

## Decision
1. **Thesis permission:** Prof. König gave a *verbal* OK to name the thesis and use the Table 5 wording.
   - Build with verbatim items and a citation, behind one content switch (`verbatim` | `paraphrased`).
   - **Written confirmation is required before the M3 launch.**
   - Without it, ship the paraphrased variant with "based on the author's M.Sc. research (unpublished)".
2. **Pulse role selector = context only.**
   - One respondent answers all 9 items.
   - The chosen role is shown with the result, plus a note that the other side may see it differently.
   - Team aggregation stays a later feature (it needs n ≥ 5 for anonymity).
3. **Lab size:**
   - guided mode: 2 episodes × 8 documents (≈ 2 minutes);
   - autoplay compare: 6 episodes per team;
   - about 30 synthetic documents in total.

## Consequences
- `release-check` must confirm the written permission before the first M3 deploy. Add it to the checklist in Phase 8.
- Pulse scoring stays as in `02_*` §3.7, and the "illustrative, not validated" footnote is unchanged.
- The Phase 7 determinism test runs autoplay for 6 episodes per team.
