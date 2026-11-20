# Thesis → Product Mapping

**Source:** Wölki, *Holding the Paradox: How Organizational Design Shapes the Automation-Augmentation Reinforcement in Established Firms* (M.Sc. thesis, University of Passau; supervisor Prof. Dr. Andreas König), draft v48.
**Purpose:** fidelity rules plus the decision logic the engine implements. If code or copy contradicts this file, this file wins.

---

## 1. Fidelity rules (what the tool must never misstate)

1. **The outcome variable is the *reinforcement*:** the signed, continuous coupling between automation and augmentation, running from vicious to virtuous. It is not the level of automation and not "balance". Balanced levels without exchange give zero reinforcement.
2. **Two feeding directions make up the reinforcement:**
   - **A→B (automation → augmentation):** freed capacity, and data on where the machine does well or fails.
   - **B→A (augmentation → automation):** expertise and corrections codified back into the pipeline.
3. **The minimum rule:** reinforcement = **min(A→B, B→A)**, each scored from −1 to +1. A strong direction cannot offset a weak one (non-compensatory). ⚠️ It is *not* "Technical readiness vs absorptive capacity" (that was the original briefing's error).
4. **Three levers → three drivers.** Each lever works only inside a guardrail that preserves its opposite:

   | Lever (proposition) | Primary driver | Guardrail (counter-pole kept) | Beyond guardrail |
   |---|---|---|---|
   | Decentralized decision rights over the split (P1) | Informed location of the split | **Shared platform:** common tools, common labels, splits visible across units | Fragmented learning |
   | Mutual adjustment instead of standardization (P2) | Adaptability of the split | **Standardized base:** data formats, hand-off points, escalation thresholds | Base dissolves, automation becomes unstable |
   | Integration of automation and augmentation work (P3) | Reciprocal exchange | **Retained differentiation:** dedicated technical time and dedicated domain time | Expertise collapses |

   *Standardize the interface, not the task allocation.*
5. **Premises:**
   - **Drift:** without a counterweight, firms tilt toward automation because its returns are easier to measure.
   - **Moving split:** the productive split between human and machine work moves over time, task by task.
6. **Moderator (P4):** environmental dynamism, i.e. how fast AI capability moves in the task domain, strengthens every driver, and adaptability most of all. Generative AI is the high-dynamism case.
7. **Trade-off:** every lever that raises the reinforcement is, in its direct effect, at best neutral and often costly for the standalone performance of at least one pole. The gain comes later and indirectly. **The tool must show this cost and never hide it.**
8. **Absorptive capacity** (Cohen & Levinthal) appears only as a *bound on integration* and as a candidate bound for configuration effects. It is not a main score.
9. **Scope and honesty:**
   - The thesis is about established firms, firm level, and ML systems in core work.
   - The propositions are untested; the questionnaire is illustrative and not validated.
   - The tool applies the logic at unit and use-case level, as Table 5 and the task-episode measure (Section 6.4) suggest. **The UI says so.**
10. **Scope conditions the engine must respect:**
    - Where task knowledge is codifiable *and* the setting is safety-critical or heavily regulated, central control over the split can be preferable (Section 5.1).
    - In crisis or hostile environments, temporary centralization can reverse P1 (Section 5.4).

---

## 2. From construct to feature

| Thesis element | Tool feature | Input | Output |
|---|---|---|---|
| Split (task level) | **Split Map** | LLM-proposed decomposition of the process into subtasks, confirmed by the user | Each subtask labelled Machine / Machine + human review / Human, with a reason |
| P1 decision rights + shared platform | **Decision Rights card** | org type, risk tier, codifiability, crisis flag | Who sets and revises the split; platform requirements; override authority; automation-bias safeguards |
| P2 mutual adjustment + standardized base | **Coordination card** | dynamism, volume, error cost | Standardized base (formats, hand-offs, thresholds) + **split review cadence** |
| P3 integration + differentiation | **Exchange card** | team setup (separate AI team or embedded), readiness | Joint working rhythm, correction feedback channel, protected expert time |
| P4 dynamism | Dynamism selector + cadence logic | model release pace / gen-AI vs classical ML | Review cadence; weight on adaptability |
| Drift premise | **Drift check** on the KPI set | proposed KPIs | Warning if only efficiency KPIs; adds augmentation-value and learning-loop KPIs |
| Trade-off (5.5) | **"What this design costs"** box | chosen lever settings | Direct cost per lever (Table 4) |
| Warning indicators (Table 4) | Monitoring plan in the 90-day rollout | — | Monitoring + warning indicator per lever |
| Table 5 questionnaire + Figure 2 | **Reinforcement Pulse** (post-launch) | 6 core items + 3 driver items, per role | Two scores, 2×2 quadrant, minimum, lagging driver → lever + guardrail |
| Feedback loop (4.4) | Pulse over time (repeat measurement) | repeated pulses | Trend; caution against lock-in and superstitious learning |

---

## 3. Decision logic (draft for the engine)

### 3.1 Subtask attributes (the LLM proposes them, the user confirms)
- `judgmentIntensity` (low / med / high)
- `knowledgeType` (codifiable / tacit)
- `errorCost` (low / med / high / critical)
- `volume` (low / med / high)
- `affectsIndividuals` (bool)
- `consequential` (bool: legal or similarly significant effect)

### 3.2 Initial split heuristic (transparent, documented)
- Machine: volume high AND codifiable AND errorCost ≤ med AND NOT consequential.
- Machine + human review: consequential OR errorCost = high OR the risk tier is ≥ III and the step bears on the decision.
- Human: errorCost = critical with tacit knowledge, OR the step *is* the consequential decision at tier IV.
- **Always** flagged as a *starting* split ("the split will move") with a review date.

### 3.3 Decision rights
- Default: the team that does the work sets and revises the split (P1), within a **shared platform**.
- Shared platform items: common tooling, common task labels, a split register visible to other teams, and a change log.
- Override: the operator can override any machine output. Overrides are logged. Override rates far outside the expected band are a signal: very low → automation-bias risk; very high → the model or the split is wrong.
- Scope switch: if the knowledge is codifiable AND (safety-critical OR the regulatory tier is ≥ III) → **central guardrails, local proposals**. Changes to the split are proposed by the team and ratified by an accountable owner.
- Crisis flag → temporary centralization, with a note that this reverses P1.

### 3.4 Coordination
- Standardized base (always): input/output schema, hand-off points, escalation thresholds (confidence, value, clause type …).
- Split review cadence by dynamism (illustrative defaults, editable):
  - high (gen-AI, frequent model releases) → **monthly**
  - medium → every 2 months
  - low (stable classical ML) → quarterly
- Each review asks: what is now automated, what is augmented, what did we learn?

### 3.5 Grouping / exchange
- Weekly joint working session between the AI/automation team and the operating unit (thesis illustration). If there is no separate AI team, a rotating "AI steward" role inside the team.
- Correction channel: every human correction is captured in a structured form and flows back to the prompt, rules or model.
- Retained differentiation: protected time for domain work (anti-deskilling) and for technical work.
- If team readiness is low: integration is bounded by absorptive capacity → ramp up exchange gradually, add enablement first.

### 3.6 Drift check (KPI set must include all three)
1. An efficiency KPI (throughput, cycle time, cost per case).
2. An **augmentation-value KPI** (quality on non-routine cases, decision quality, rework avoided).
3. A **learning-loop KPI** (corrections fed back per month, split changes per quarter, override rate within band).

If 2 or 3 is missing → drift warning with suggested KPIs.

### 3.7 Reinforcement Pulse scoring (Table 5)
- Items A1–A3 are rated by the people doing augmentation work; B1–B3 by the team that runs the AI system; D1–D3 by both.
- Scale 1–7. Direction score = (mean − 4) / 3 → range −1 to +1.
- Reinforcement = min(A, B).
- Quadrants:
  - both > 0 → virtuous
  - one ≤ 0 → one-sided (vicious despite the strong side)
  - both ≤ 0 → vicious
  - Positive half-axes = one-way limit case (reinforcement 0).
- Lowest D item → lagging driver → lever and guardrail (Table 4).
- Mandatory footnote: "Illustrative instrument from a conceptual thesis; not psychometrically validated."

---

## 4. Glossary for UI copy (Canadian English)

- **Split:** the boundary between steps the machine handles and steps a person handles. It moves.
- **Reinforcement:** how strongly automation and augmentation feed each other (−1 to +1).
- **Guardrail:** the counter-pole you keep so a design lever doesn't overshoot.
- **Drift:** the default tilt toward automation because its returns are easier to measure.
- **Direct cost:** what a lever costs standalone performance before the indirect gains arrive.
