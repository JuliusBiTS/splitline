# ADR-0006: Rule facts come from user-ticked inputs; consequential floor

- **Status:** Accepted · **Date:** 2026-11-20

## Context
Several catalogue rules need facts the v0.9 intake never collected:

| Rule | Missing fact |
|---|---|
| INS-FAIR | the organization is an insurer |
| ON-ESA-AI, BC-HRC-01 | hiring or performance decisions |
| HC-SAMD-01 | clinical triage |
| BC-OIPC-SCRIBE | ambient recording |
| FED-DADM-01 | an administrative decision |
| BC-GOV-GENAI | the organization is a ministry |

Separately, the LLM proposes subtask attributes (`consequential`, `errorCost`) that feed both the tier and the split. A user who confirms without reading would let the LLM set the tier, which stretches ADR-0001.

## Decision
1. Add two essential step-2 questions:
   - `sector`: insurance, health_care, financial_services, government_ministry, other.
   - `useCasePatterns` (multi-select): hiring_selection, performance_management, clinical_triage, ambient_scribe, claims_eligibility, administrative_decision, customer_chatbot.
2. Only user-ticked values reach the engine.
   - The decomposition may return `suggestedUseCasePatterns`. Step 3 shows them as one-click suggestions and never applies them automatically.
   - Rule predicates never read free text.
3. **Consequential floor:** "Confirm split" is blocked when all three hold:
   - `aiDecisionRole ≠ informs`;
   - someone other than `businesses_only` is affected;
   - no subtask is marked consequential.

   It unblocks once the user marks a subtask as consequential, or explicitly confirms that none applies. That confirmation is shown in the rationale.
4. Rows that are consequential or have high/critical error cost are highlighted. The tier rationale names the subtask that supplied the consequential points.
5. Mitigations and the reversibility override are also user inputs (ADR-0004).

## Consequences
- Every rule trigger traces to a field the user set. This keeps ADR-0001 intact and makes `matchedFacts` honest.
- Step 2 grows from 6 to 8 essential questions. The patterns question needs clear helper text (Phase 4/6 copy).
- Tests:
  - each pattern triggers at least one rule;
  - the floor blocks confirmation in exactly the right cases;
  - suggestions don't change engine output until they are ticked.
