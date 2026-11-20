---
name: add-legal-rule
description: Add or change a governance rule in the Splitline rules engine (src/content/rules). Use whenever a rule, its trigger, status, sources or wording changes.
argument-hint: "[RULE-ID] [short description]"
---
Add or update rule $ARGUMENTS.

1. Read docs/research/01_legal-landscape-canada-bc.md (§0 status taxonomy, §2 instrument, §3 catalogue row). If the rule is not in the research file, STOP and ask Julius for the source before writing anything.
2. Implement it in the matching file in `src/content/rules/` as a `RuleDefinition` (see docs/SPEC.md §7.1):
   - `status` exactly as in research §2; `effectiveDate` for IN_FORCE_FUTURE
   - `appliesWhen` uses only `CaseFacts` fields; keep it readable
   - `severity`: blocker only with a redesign path described in `actionsToConsider`
   - plain-language `consideration` (≤ 2 sentences), Canadian English, wording rules from CLAUDE.md
   - at least one source URL; `lastVerified` = today's date (ISO)
3. Tests in `src/content/rules/<file>.test.ts`: at least one intake where the rule triggers and one where it doesn't; update the golden-case expectations in tests/golden if a preset is affected (and say why).
4. Run `pnpm verify` and `pnpm eval:engine`; paste the output.
5. Run the `legal-content-reviewer` subagent on the change and fix its findings.
