# ADR-0001: The LLM never decides tiers, rules, verdicts, splits or scores

- **Status:** Accepted · **Date:** 2026-11-20

## Context
The original briefing had Claude generate every score (0–100), the AIA level and the compliance status. That output is not reproducible, not explainable ("why 72?"), and too slow for a live what-if simulator. It also contradicts the product's own message about human oversight and calibrated trust.

## Decision
A deterministic, tested TypeScript engine (`src/engine/`) computes the indicative tier, triggered rules, verdict, split owners, lever settings, rollout and Pulse scores. The LLM is limited to:
1. Decomposing free-text process descriptions into subtasks, which the user must confirm.
2. Writing narrative from engine facts, guarded so it cannot introduce rules that did not trigger.
3. Extracting fields from synthetic documents in the Living Lab (live mode only; demo runs are pre-recorded).

## Consequences
- What-if recomputes in under 100 ms; golden cases are snapshot-testable.
- Interview story: "I applied human-in-the-loop to my own tool."
- The calibration of the tier weights is a visible design decision (ADR-0004), not hidden in a prompt.
