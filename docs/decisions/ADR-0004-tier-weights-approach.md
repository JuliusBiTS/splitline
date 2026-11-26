# ADR-0004: Indicative tier: calibration approach and inputs

- **Status:** Accepted. Final weights and the hiring tier recorded in Phase 1 (see "Phase 1 result"). · **Date:** 2026-11-20

## Context
SPEC §7.2 gave initial weights for the AIA-inspired indicative tier, but three inputs had no source:
- **Mitigations:** needed for the 15% AIA deduction.
- **Reversibility:** "derived from function + role", with no mapping.
- **Scale/vulnerability:** no intake field.

Reversibility is the largest factor (0–6) and decides whether the claims preset lands at II (expected) or III. The hiring golden was "III or IV", which can't be asserted exactly. Free weight tuning on four cases would overfit and make the tier hard to defend. AIA mechanics: `docs/research/01_*` §2.5.

## Decision
1. **Thresholds fixed** to the AIA bands: `pct = 100 × score / max`; I ≤ 25, II ≤ 50, III ≤ 75, IV otherwise.
2. **Weights calibrate only within ±1 point** of the SPEC §7.2 table. If a golden still misses, stop and ask Julius; never silently change an expected tier.
3. **Mitigations:** five optional checkboxes in "More context", unticked by default; ≥ 4 of 5 ticked → deduct 15% of the raw score.
4. **Reversibility:** a derived default that the user can override.
   - Base value comes from the decision role.
   - +1 step for the hiring, clinical-triage or claims patterns.
   - −1 step with an appeal path.
   - Shown with the DADM anchor wording; an override is named in the rationale.
5. **Scale/vulnerability:** derived, capped at 3. One point each for:
   - patients or children involved;
   - public customers or patients affected;
   - a high-volume subtask that affects individuals.
6. **Golden tiers are exact.** Hiring is pinned after calibration and recorded here.

**Feasibility check** with the SPEC weights (max 32; illustrative, to be confirmed in Phase 1):

| Preset | Raw score | Without mitigations | With mitigations | Tier |
|---|---|---|---|---|
| Claims | ≈ 20 without an appeal path (hard_to_reverse); ≈ 18 with one (short_term) | 62.5% | 18 × 0.85 = 15.3 → 48% (4/5 ticked incl. appeal path) | II |
| Clinical | ≈ 22 | 69% | 59% | III |
| Contract | ≈ 12 | 38% | — | II |
| Hiring | ≈ 26 | 81% | — | IV |

**Phase 1 adds here:**
- the final weight table;
- the reversibility lookup;
- each preset's score breakdown;
- the pinned hiring tier.

## Consequences
- The tier is explainable factor by factor, and the calibration freedom is bounded and visible.
- The claims preset relies on its mitigations to stay at II. That is intended (it is the AIA mechanic), and the preset shows it in What-if.
- New intake fields come from ADR-0006.
- New tests: threshold boundaries, the mitigation rule, the reversibility table, exact golden tiers.

## Phase 1 result (2026-11-20)

### Final weights
Calibration needed **no change**: every weight equals the SPEC §7.2 table (delta 0 on every weight, inside the ±1 bound). Code: `TIER_WEIGHTS` in `src/engine/tier.ts`; a test pins it to this table.

| Factor | Values → points |
|---|---|
| AI decision role | informs 1 · recommends 3 · decides_with_review 5 · decides_alone 8 |
| Most consequential subtask | none 0 · consequential 4 |
| Data sensitivity (max) | no_personal 0 · customer_pi 2 · financial 3 · employee_hr 4 · health / biometric / children 5 |
| Affected people (max) | businesses_only 0 · public_customers 2 · employees_applicants 3 · patients 4 |
| Reversibility | reversible_brief 0 · short_term 2 · hard_to_reverse 4 · irreversible 6 |
| Scale/vulnerability | 0–3 (derived) |
| Customer-facing generative output | +2 (only when `aiType = generative_llm`) |

Maximum = 32. Thresholds: I ≤ 25 % · II ≤ 50 % · III ≤ 75 % · IV otherwise (inclusive upper bounds). Mitigations: ≥ 4 of 5 → score × 0.85.

### Reversibility lookup
Base by decision role, then +1 step for `hiring_selection`, `clinical_triage` or `claims_eligibility` (once, however many are ticked), −1 step with `appeal_path`, clamped to the four anchors. `reversibilityOverride` replaces the result and is named in the rationale.

| Decision role | Base | + pattern | + appeal path | + both |
|---|---|---|---|---|
| informs | reversible_brief | short_term | reversible_brief | reversible_brief |
| recommends | short_term | hard_to_reverse | reversible_brief | short_term |
| decides_with_review | short_term | hard_to_reverse | reversible_brief | short_term |
| decides_alone | hard_to_reverse | irreversible | short_term | hard_to_reverse |

### Preset score breakdowns
| Preset | Role | Consq. | Data | Affected | Reversibility | Scale | CF-gen | Raw | Mitigations | Score | % | Tier |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| clinical-referral-triage | recommends 3 | 4 | health 5 | patients 4 | short_term +1 clinical → hard_to_reverse 4 | 3 | 0 | 23 | 3 of 5, no deduction | 23 | 71.9 | **III** |
| contract-clause-review | recommends 3 | 4 | customer_pi 2 | businesses_only 0 | short_term 2 | 1 | 0 | 12 | 1 of 5 | 12 | 37.5 | **II** |
| hiring-and-sentiment | decides_alone 8 | 4 | employee_hr 4 | employees_applicants 3 | hard_to_reverse +1 hiring → irreversible 6 | 1 | 0 | 26 | 0 of 5 | 26 | 81.3 | **IV** |
| claims-document-intake | recommends 3 | 4 | health 5 | public_customers 2 | short_term +1 claims −1 appeal → short_term 2 | 2 | 0 | 18 | 4 of 5 → −15 % | 15.3 | 47.8 | **II** |

Scale: clinical = patients (vulnerability) + patients (reach) + high-volume step affecting individuals; hiring = high-volume step only; claims = public customers + high-volume step; contract = high-volume step affecting individuals (since the Phase 5 recorded decomposition, ADR-0019; it was raw 11 with scale 0 before).

### Pinned hiring tier
**`hiring-and-sentiment` is pinned at tier IV** and asserted exactly in `tests/golden/expectations.ts`.

### Sensitivity (each weight moved ±1 on its own, maximum recomputed)
- Clinical, contract and hiring keep their tiers under every single ±1 change.
- Claims flips to III if `recommends`, `public_customers` or `short_term` rises by 1 (score 16.15 → 50.5 %). It sits close to the II/III boundary by design: without the mitigation deduction it is III (56.3 %), and the preset shows that in What-if. Any future weight change must re-run `pnpm eval:engine`.
