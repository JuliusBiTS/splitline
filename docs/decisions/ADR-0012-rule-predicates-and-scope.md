# ADR-0012: Rule predicates, scope-dependent status and draft guidance (v1.0)

- **Status:** Accepted · **Date:** 2026-11-20

## Context
The `legal-content-reviewer` checked SPEC v1.0 against `docs/research/01_*`. It found five problems:
- **Fixed status per rule.** Several rules have a status that depends on who the instrument binds, e.g. DADM (GOVERNMENT_POLICY for federal institutions, REFERENCE elsewhere) and INS-FAIR (guidance for BC-authorized insurers, REFERENCE for a Crown insurer). A single fixed status per rule can't express that.
- **Draft guidance treated as settled.** FED-OPC-VENDOR's guidance is still a draft (consultation until 2026-12-04), yet it could have blocked.
- **Mismatched predicates.** Several SPEC predicates under- or over-triggered compared with the research catalogue.
- **Unsatisfied golden facts.** Some golden-case facts as described didn't satisfy the research triggers.

`docs/research/` is write-protected. This ADR is the authoritative predicate list until Julius asks for `01_*` §3 to be synced.

## Decision
1. **Model:** `RuleDefinition` gains `inScope`, `statusWhenOutOfScope`, `scopeLabel` and `draft`.
   - `effectiveStatus` drives both the cap and the label (SPEC §7.1).
   - Drafts are capped at action and labelled "Regulator draft (consultation until <date>)".
   - `effectiveDate` is required for IN_FORCE_FUTURE (Zod refinement).
2. **Ranking:** IN_FORCE > in-scope GOVERNMENT_POLICY > IN_FORCE_FUTURE > REGULATOR_GUIDANCE > draft. This supersedes the ranking in ADR-0007 §3. A policy that binds today outranks a future supervisory guideline.
3. **Settled predicates** (Phase 1 implements them with the `add-legal-rule` skill):
   - **BC-PIPA-MON:** private org under BC PIPA (`bc_private`, or `other_canadian_private` with `bc` in jurisdictions) AND (`monitorsEmployees` OR (`businessFunction = hr` AND `performance_management`)).
   - **BC-HRC-01:** `bc` in jurisdictions (or a BC org type) AND (`hiring_selection` OR `performance_management` OR `claims_eligibility` OR an eligibility-type `administrative_decision`). It is now a must-trigger for the claims preset.
   - **FED-C36-ADM (PROPOSED):** federally regulated organizations, or commercial activity about customers or the public with a consequential subtask. Not for a provincial employer's own staff. It is now must-NOT for the hiring preset.
   - **FED-OPC-VENDOR:** in scope for private-sector org types; REFERENCE for public bodies, since vendor due diligence still makes sense under FIPPA s. 30.
     - Trigger: `hosting ∈ {us_or_global_api, unsure}` OR `teamSetup = vendor_run` OR `aiType = generative_llm`.
     - Draft until the OPC finalizes the guidance; re-check after 2026-12-04 (research §4 item 3).
   - **INS-FAIR:** `sector = insurance` AND (`claims_eligibility` OR `customerFacingOutput` OR public customers affected). REGULATOR_GUIDANCE for BC-authorized private insurers; REFERENCE for Crown insurers.
   - **LIAB-CUSTFACING:** `customerFacingOutput` AND `aiType = generative_llm`. The `customer_chatbot` pattern is an alternative path, not a requirement.
   - **BC-GOV-GENAI:** `orgType = bc_public_body` AND `sector = government_ministry` AND `aiType = generative_llm`.
     - Triggers only when `genAiToolType = public_tool`.
     - If the tool type is unset → info "confirm the tool is an approved enterprise tool".
     - Health authorities are excluded, because they have their own policies.
   - **FED-DADM-HITL:** in scope for `federal_institution` (label "Mandatory for federal institutions"), REFERENCE elsewhere.
     - Federal wording: "If your official AIA returns Level III or IV…".
     - Capped at action even in scope, so the official AIA (FED-DADM-01) decides, not the indicative tier.
   - **ON-ESA-AI:** `hiring_selection` AND `ontario` in jurisdictions AND `employerSize25Plus ≠ false`. Unset → info "Confirm headcount (≥ 25 employees triggers the Ontario posting disclosure)".
   - **QC-L25-121:** `quebec` in jurisdictions AND personal data AND either:
     - `decides_alone` → action; or
     - `decides_with_review` without `human_final_decision` → info "ensure the human review is meaningful; a pro-forma sign-off likely does not take the decision out of s. 12.1".
   - **BC-FIPPA-XB:** sensitive-PI tiers as in SPEC §7.1 (heuristic wording; s. 30 action in both tiers).
4. **New intake field:** `genAiToolType` (advanced, shown when `aiType = generative_llm`).
5. **Golden rows** now state `businessFunction` and `aiType` wherever a must-trigger depends on them (SPEC §10).

## Consequences
- Tests:
  - INS-FAIR on the claims preset renders as "Reference framework" at info;
  - FED-OPC-VENDOR can't exceed action while it is a draft;
  - FED-C36-ADM doesn't trigger on the hiring preset;
  - each predicate above has at least one triggering and one non-triggering case.
- `release-check` re-verifies the OPC draft status and flips `draft` off when the guidance is final.
- `01_*` §3 drifts from this ADR until synced. The `add-legal-rule` skill must cite this ADR for these rules.
