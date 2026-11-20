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
2. **Pulse role selector = context only.** This is a deliberate MVP deviation from `02_*` §3.7, which assigns A items to augmentation staff, B items to the AI team and D items to both.
   - One respondent answers all 9 items as a single-respondent proxy.
   - The result is labelled "single-perspective estimate" and shows the chosen role.
   - A note explains the intended per-role assignment and that the other side may see it differently.
   - Team aggregation stays a later feature (it needs n ≥ 5 for anonymity).
3. **Lab size:**
   - Corpus: 48 synthetic documents = 6 **disjoint** episodes × 8, with the `05_*` §2 type mix in each episode.
   - Guided mode: episodes 1–2 (≈ 2 minutes), labelled "single-step change".
   - Autoplay compare: both teams over the same 6 episodes.
   - No document is reused, so codified rules are always evaluated on documents they were not derived from (guard against superstitious learning, `05_*` §5).

## Consequences
- `release-check` must confirm the written permission before the first M3 deploy. Add it to the checklist in Phase 8.
- The Pulse formula and the minimum rule stay exactly as in `02_*` §3.7; only the role assignment is replaced by the single-respondent proxy.
- Both the short label and the verbatim footnote are required: "Illustrative instrument from a conceptual thesis; not psychometrically validated."
- `02_*` §3.7 itself is not amended, because `docs/research/` changes only on Julius's request. This ADR is the record of the deviation.
- Recorded extraction runs cover 48 documents. That is still a few dollars at most; Julius approves the run.
- The Phase 7 determinism test runs autoplay for 6 episodes per team.
