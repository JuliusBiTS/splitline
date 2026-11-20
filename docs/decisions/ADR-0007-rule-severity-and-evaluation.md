# ADR-0007: Severity cap by status, evaluation order, ranking, sensitive PI, unknown hosting

- **Status:** Accepted · **Date:** 2026-11-20

## Context
In v0.9 any rule could set any severity:
- A PROPOSED bill such as FED-C36-XB could drive the verdict.
- A REFERENCE rule could block.

That conflicts with "never show a PROPOSED bill as binding" (`01_*` §0). Four more points were unclear:
- **Tier vs. rules:** some rules read the tier (FED-DADM-HITL), while the tier is computed from facts.
- **Top 3 ranking:** conditions were "ranked by tier contribution", but rules don't contribute to the tier.
- **"Sensitive" for BC-FIPPA-XB:** B.C. Reg. 294/2021 leaves the definition to the public body.
- **`hosting = unsure`:** no defined behaviour.

## Decision
1. **Evaluation order:** facts → tier → rules (may read the tier) → severity cap → verdict → operating model → rollout. The tier never reads rules.
2. **Severity cap by status:**
   - IN_FORCE, IN_FORCE_FUTURE, in-scope GOVERNMENT_POLICY and REGULATOR_GUIDANCE may reach blocker.
   - PROPOSED, VOLUNTARY, REFERENCE and out-of-scope GOVERNMENT_POLICY are capped at info.
   - `effectiveSeverity = min(ruleSeverity, cap)`.
   - BC-PIPA-MON is regulator guidance, so it stays a blocker and the hiring preset stays Redesign.
   - FED-DADM-HITL is capped to info for non-federal organizations, but the operating model still applies its human final decision at tier ≥ III.
3. **Top 3 conditions**, ranked by:
   1. severity;
   2. bindingness (IN_FORCE > IN_FORCE_FUTURE > GOVERNMENT_POLICY > REGULATOR_GUIDANCE);
   3. whether the matched facts include a top-3 tier factor;
   4. catalogue order.
4. **Sensitive PI (BC-FIPPA-XB):**
   - health, biometric, children, financial → action;
   - other personal categories → info, with "assess whether this is sensitive; the head of the public body decides".
5. **Hosting `unsure`:** treated as outside Canada for every cross-border rule. The rule shows the matched fact "Hosting unknown; assumed outside Canada" and the action "Confirm the vendor's processing and storage region".
6. **Split precedence:** apply the `02_*` §3.2 heuristic first, then the tier override. Owners only ever move toward more human control.

## Consequences
- Tests:
  - the cap holds for every rule × status, and PROPOSED never rises above info;
  - evaluation is acyclic;
  - ranking is deterministic;
  - BC-FIPPA-XB produces the two severity tiers;
  - `unsure` behaves exactly like outside Canada for the cross-border rules.
- `legal-content-reviewer` checks that UI wording follows the capped status ("Prepare for (proposed)" etc.).
- The contract preset still reaches "Go with conditions", through BC-PIPA-01 and FED-PIPEDA-XB rather than through C-36.
