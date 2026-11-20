# ADR-0015: Rule predicate refinements after the Phase 1 review

- **Status:** Accepted (one item open for Julius, see "Open") · **Date:** 2026-11-20

## Context
The Phase 1 `legal-content-reviewer` and `plan-reviewer` compared the catalogue (`src/content/rules/`) with `docs/research/01_*` and ADR-0012. They found triggers that fire for the wrong organizations, one gap, and refinements that sat only in code comments. ADR-0012 stays the authoritative predicate list; this ADR amends it. `docs/research/` is unchanged (write-protected).

## Decision
1. **FED-PIPEDA-XB and FED-C36-XB:** require personal information other than `employee_hr`, unless the organization is a federally regulated FI. A provincially regulated employer's staff data falls under BC PIPA, not PIPEDA's commercial-activity scope.
2. **BC-PIPA-01 / BC-PIPA-EMP split:**
   - BC-PIPA-01 covers personal information other than employee information.
   - BC-PIPA-EMP covers *any* use of `employee_hr` data by a BC PIPA organization, no longer only HR, hiring or performance management.
   - Together they leave no gap, and the general consent wording is never shown for employee data that has its own regime.
3. **BC-HRC-01:**
   - Excludes `federal_institution` and federally regulated **banks** (`federally_regulated_fi` + `financial_services`), which fall under the Canadian Human Rights Act.
   - Federally regulated insurers stay in.
   - Any `administrative_decision` triggers it, because the intake can't tell an eligibility-type decision apart. That is deliberately broader than ADR-0012's "eligibility-type".
4. **BC-only instruments:** INS-FAIR (BCFSA code) and BC-OIPC-SCRIBE (OIPC BC) need a BC connection (`bc` in jurisdictions or a BC org type). Outside BC they don't appear at all.
5. **QC-L25-121:** private-sector organizations only, because s. 12.1 is in Quebec's private-sector Act.
6. **QC-AMF-AI:** excludes federally regulated banks, which the AMF does not supervise.
7. **Wording:** the INS-FAIR note says the Crown insurer is "likely outside" the Code's scope. The ban list also covers "mandatory action" and "required by law".
8. **Sources:** FED-PIPEDA-XB now leads with the OPC vendor release (processor accountability). BC-HRC-01's only source is the oversight offices' joint call, labelled as context. A primary source for the Human Rights Code still has to be added to research §5.

`RULE_CATALOGUE_VERSION` → `2026-11-20.2`. Every golden expectation is unchanged; tests cover each refinement (`src/content/rules/review-fixes.test.ts`).

## Open (Julius to decide)
- **BC-PIPA-MON, HR + performance management without monitoring.** ADR-0012 fires this rule as a blocker for `businessFunction = hr` AND `performance_management` even when `monitorsEmployees = false`. Research §3 ties the blocker to monitoring or productivity/sentiment scoring. So an AI that only drafts review summaries from manager notes gets **Redesign**. Options:
  - (a) keep it as is;
  - (b) lower that path to action and keep blocker for `monitorsEmployees`;
  - (c) add a "scores productivity or sentiment" flag.
  
  Code follows ADR-0012 until decided. The hiring preset doesn't depend on this, because it sets `monitorsEmployees = true`.
- **Research §5 additions:** a primary source for the BC Human Rights Code and for PIPEDA processor accountability.

## Consequences
- Fewer false positives for employers, public bodies and banks; no BC PIPA gap for employee data.
- `01_*` §3 drifts further from the code until synced. `release-check` should re-verify the FED-OPC-VENDOR draft status after 2026-12-04, the C-36 stage, and the SaMD criterion-2 wording (research §4).
