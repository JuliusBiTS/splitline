# ADR-0004: Indicative tier: calibration approach and inputs

- **Status:** Accepted (approach). Final weights and the hiring tier are added in Phase 1. · **Date:** 2026-11-20

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
| Claims | ≈ 18 | 56% | 15.3 → 48% (4/5 ticked) | II |
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
