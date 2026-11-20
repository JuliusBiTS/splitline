# ADR-0002: Fictional organizations and synthetic data only

- **Status:** Accepted · **Date:** 2026-11-20

## Context
The presets are inspired by real Vancouver employers and public bodies. A public demo that names or imitates real organizations (logos, forms, fee schedules) could mislead users and create legal and reputational risk. The Living Lab needs realistic receipts, which contain health and personal information.

## Decision
- All presets use fictional organizations (e.g. "Cascadia Public Auto" instead of any real insurer). No real names, logos, forms, fee schedules or provider names.
- All Lab documents are generated synthetically from ground-truth JSON with clearly fictional people.
- Users cannot upload files in the MVP; intake shows a "do not enter personal information" banner.

## Consequences
- Synthetic ground truth doubles as the extraction eval set.
- Realism comes from the process and the rules, not from copying real artifacts.
- README and UI state that all organizations and data are fictional.
