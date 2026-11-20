# Splitline – Masterplan: Start hier

Dieses Paket ist das Startgerüst deines Repos. Claude Code findet darin alles, was es braucht: Spec, Plan, Recherche, Regeln, Review-Agents und Qualitäts-Hooks. Du arbeitest Phase für Phase. Jede Phase startet in einer frischen Session mit dem passenden Prompt unten.

## Was drin ist
| Pfad | Zweck |
|---|---|
| `CLAUDE.md` | Projektregeln, die Claude in jeder Session liest (kurz gehalten, < 200 Zeilen) |
| `docs/SPEC.md` | **Was** gebaut wird: Anforderungen, Datentypen, Golden Cases, offene Fragen |
| `docs/PLAN.md` | **In welcher Reihenfolge:** 10 Phasen mit prüfbaren Abnahmekriterien und Meilensteinen |
| `docs/research/` | Deine Recherche (Recht, Thesis-Mapping, Lab, UX, Checkliste). Schreibgeschützt per Hook |
| `docs/decisions/` | ADRs: 0001 LLM entscheidet nie; 0002 nur fiktive Daten; 0003 keine Server-Persistenz |
| `docs/claude-design-brief.md` | Fertiges Briefing zum Einfügen in Claude Design |
| `.claude/settings.json` + `scripts/hooks/` | Hooks: schützen `.env` und `docs/research/`; Claude darf nicht „fertig“ melden, solange `pnpm verify` rot ist |
| `.claude/agents/` | Drei Prüfer: `plan-reviewer`, `legal-content-reviewer`, `thesis-fidelity-reviewer` |
| `.claude/skills/` | `add-legal-rule` (Regeln sauber anlegen), `/release-check` (vor jedem Deploy) |

## Vorbereitung (einmalig, ca. 30 Minuten)
1. **Installieren:** Claude Code, Node 24 LTS, pnpm, git. (jq ist nicht mehr nötig: die Hooks sind Node-Skripte, siehe ADR-0011.)
2. **GitHub:** neues Repo `splitline` anlegen und den Inhalt dieses Pakets als ersten Commit pushen.
3. **Anthropic Console:** Workspace „splitline“, API-Key erzeugen, **Spend Limit setzen** (z. B. 25 USD/Monat).
4. **Hooks:** erledigt in Phase 0 (Node-Skripte unter `scripts/hooks/*.mjs`, laufen auf Windows und Mac).
5. **Prof. König fragen**, ob du die Arbeit öffentlich referenzieren darfst (blockiert erst den Launch, nicht den Bau).
6. **Später (Phase 6):** Vercel- und Upstash-Accounts.

## Arbeitsweise (wichtig)
- **Eine Phase = frische Session.** Starte mit `claude`, wechsle mit Shift+Tab in den **Plan Mode** und füge den Start-Prompt ein. Lies den Plan und korrigiere ihn mit Ctrl+G, bevor Claude loslegt.
- **Evidence statt „sieht fertig aus“:** Claude muss die Ausgaben der Befehle und Screenshots zeigen. Die Hooks erzwingen grüne Tests.
- **Vor dem Abschluss** jeder Phase: Reviewer-Subagent laufen lassen (steht in den Prompts).
- **Wenn Claude zweimal am selben Problem scheitert:** `/clear` und mit einem besseren Prompt neu starten.
- **Kosten:** `pnpm eval:llm` und die Record-Skripte rufen die echte API auf. Die laufen nur nach deinem OK.

## Zeitplan (Vorschlag, an die Thesis-Abgabe anpassen)
| Woche | Phasen | Meilenstein |
|---|---|---|
| ab ~1. Dez. | 0 (Setup + Spec-Interview) | M0 Spec fix |
| Dez. Woche 1–3 | 1, 2 (Engine) ‖ 3 (Claude Design, parallel) → 4, 5, 6 | **M1 Core live (~23.12.)** |
| Jan. Woche 1–2 | 7 (Living Lab) | **M2 (~15.01.)** |
| Jan. Woche 3–4 | 8, 9 (Härtung, README, Loom) | **M3 launch-ready (~29.01.)** |

---

## Start-Prompts (kopieren, in den Plan Mode einfügen)

### Phase 0: Setup & Spec-Interview
```
We're starting Phase 0 of docs/PLAN.md. Read CLAUDE.md, docs/PLAN.md (Phase 0) and docs/SPEC.md.
1) Propose the scaffold plan (Next.js 16, pnpm, TS strict, Tailwind, Vitest, Playwright, axe, CI) and wait for my OK.
2) After scaffolding, interview me with AskUserQuestion about every item in SPEC §14 plus anything in SPEC you find ambiguous or risky. Dig into the hard parts, not the obvious ones.
3) Update docs/SPEC.md to v1.0 and write ADRs for the decisions. Show `pnpm verify` output at the end.
```

### Phase 1: Rules engine
```
Phase 1 of docs/PLAN.md. Read the Phase 1 section, SPEC §5, §7.1–7.3 and §10, and docs/research/01_legal-landscape-canada-bc.md §0–§3.
Plan the engine types, facts derivation, rule catalogue (use the add-legal-rule skill for every rule), tier scoring and verdict. Calibrate the tier weights on the 4 golden cases and record them in ADR-0004.
Done = all Phase 1 acceptance checks pass, with output shown. Then run the legal-content-reviewer and plan-reviewer subagents and fix correctness findings.
```

### Phase 2: Operating model & Pulse
```
Phase 2 of docs/PLAN.md. Read the Phase 2 section, SPEC §7.4–7.7 and docs/research/02_thesis-to-product-mapping.md (binding).
Implement split, levers, cadence, drift, rollout, what-if and pulse scoring as pure, tested functions. Show coverage and the benchmark.
Then run the thesis-fidelity-reviewer and plan-reviewer subagents and fix correctness findings.
```

### Phase 3: Claude Design (du führst)
Öffne Claude Design, füge `docs/claude-design-brief.md` ein und lass dir drei Akzent-Optionen zeigen. Dann:
1. Designsystem und fünf Screens erstellen.
2. Fünf-Sekunden-Test mit drei Personen machen.
3. Den Handoff an Claude Code schicken.

Danach in Claude Code:
```
Import the Claude Design handoff for Splitline. Map tokens into the Tailwind theme (src/styles/tokens.css) and create the base components listed in docs/research/06_ux-ui-guidelines.md §3 as unstyled-logic + token-styled React components with stories or a /dev/components page. Write ADR-0005 with the chosen direction and test findings I give you.
```

### Phase 4: UI-Gerüst & Presets
```
Phase 4 of docs/PLAN.md. Read the Phase 4 section, SPEC §4, §10, §12 and docs/research/06_ux-ui-guidelines.md.
Build the layout, landing with preset gallery, the /preset/[slug] workspace with all tabs, what-if drawer, /sources, /self-assessment and /about, using the design components. Presets must render with zero API calls.
Done = e2e, axe and Lighthouse checks from Phase 4 pass; attach desktop and 375 px screenshots. Run plan-reviewer.
```

### Phase 5: LLM-Schicht
```
Phase 5 of docs/PLAN.md. Read the Phase 5 section, SPEC §6 and §8, and docs/research/04_architecture-notes.md §2b.
Implement src/llm (client, decompose, narrate, prompts), the guard, API routes with Upstash rate limiting and the kill switch, plus mocked-SDK unit tests for every error path. Do not call the real API without asking me.
When the tests are green, ask me before running scripts/record-presets.ts and pnpm eval:llm; commit the eval report. Run plan-reviewer.
```

### Phase 6: Live-Intake, Export, Pulse, Deploy (→ M1)
```
Phase 6 of docs/PLAN.md. Read the Phase 6 section and SPEC §4–6, §7.7, §11.
Build /case/new (3-step intake with manual fallback), /case/[id], export (Markdown charter, one-page print CSS, inventory JSON) and /pulse. Then guide me through the Vercel + Upstash setup step by step and run /release-check before the first production deploy.
Done = Phase 6 acceptance checks with evidence. Run plan-reviewer.
```

### Phase 7: Living Lab Lite (→ M2)
```
Phase 7 of docs/PLAN.md. Read the Phase 7 section, SPEC §9 and docs/research/05_living-lab-design.md fully.
Plan in this order: synthetic document generator → (ask me) recorded extraction runs + accuracy report → src/lab pipeline and metrics with fixtures → /lab UI (review queue, rule inbox, split register, dashboard, autoplay compare, live single-doc).
All organizations and people are fictional (ADR-0002). Done = Phase 7 acceptance checks incl. the determinism test and keyboard-only e2e. Run thesis-fidelity-reviewer and plan-reviewer.
```

### Phase 8: Härtung
```
Phase 8 of docs/PLAN.md. Run the full hardening checklist: a11y on all routes, copy pass (Canadian English, legal microcopy, honesty labels), Lighthouse, dependency audit, secret scan, then /release-check. Fix what fails; commit the reports in docs/evals/.
```

### Phase 9: Launch & Packaging (→ M3)
```
Phase 9 of docs/PLAN.md. Draft the README per docs/research/03_produktstrategie-und-ideen.md §7 (live link, GIF placeholder, architecture diagram as Mermaid, thesis summary, limits, all-fictional note). Then write a Playwright smoke test against the production URL. I'll record the Loom; draft a 2-minute script for it.
```

---

## Was du selbst tun musst (Claude kann das nicht)
- Prof. König fragen, Spend Limit setzen, Accounts anlegen, Domain (optional).
- Designrichtung entscheiden und den Fünf-Sekunden-Test mit echten Menschen machen.
- Die Loom aufnehmen, LinkedIn-Posts veröffentlichen, die „Use-Case-Clinic“ anbieten.
- Vor jedem Interview: Demo auf dem Handy öffnen und prüfen.
