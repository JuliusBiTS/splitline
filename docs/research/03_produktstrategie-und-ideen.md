# Produktstrategie, Marktbefunde & Ideen-Pitches

**Stand:** 20.11.2026 · **Für:** Juju · **Zweck:** Entscheidungsgrundlage, bevor der Bauplan für Claude Code entsteht.

---

## 1. Die Kernaussage in einem Satz

> **Die meisten KI-Piloten scheitern nicht am Modell, sondern daran, dass Mensch und Maschine nicht voneinander lernen. Deine Masterarbeit erklärt, mit welchen Organisationsentscheidungen dieser Lernkreislauf entsteht – das Tool macht daraus ein Werkzeug, das einen Use Case in 15 Minuten von der Idee bis zum governance-geprüften Betriebsmodell führt und ihn nach dem Launch misst.**

Warum dieser Aufhänger trägt:
- **MIT-NANDA-Studie „The GenAI Divide“:** Die viel zitierte Zahl ist, dass 95 % der Organisationen keinen messbaren P&L-Effekt aus GenAI sehen. Als Ursache nennt sie eine „Lernlücke“: Die Tools behalten kein Feedback, passen sich nicht an und fügen sich nicht in die Abläufe ein.
- **Genau das ist dein Konstrukt:** die *reciprocal exchange* und die *adaptability of the split*.

Damit hast du eine Story, die Recruiter verstehen, und eine Theorie, die Hiring Manager respektieren.

---

## 2. Was der Markt verlangt (Belege aus echten Ausschreibungen in Vancouver)

| Arbeitgeber / Rolle | Was gefordert wird | Was das fürs Tool heißt |
|---|---|---|
| **AI Enablement & Engagement Lead** (Vancouver, 110–125 k CAD) | Strukturierter Use-Case-Intake aus Workshops (Problem, Datenkontext, Priorität, grobe Machbarkeit); Pflege von PRDs und Governance-Doku; Adoption tracken und zu wenig genutzte Lösungen früh melden | Fast 1:1 dein Tool: Intake → Design → Doku-Export → Pulse nach dem Launch |
| **EY, Manager AI Adoption & Enablement** (Vancouver, 92–138 k CAD) | KI praktisch in den Arbeitsalltag bringen | Enablement-Plan, Rollout, Adoptions-KPIs |
| **KPMG, Senior Manager AI Strategy** (Vancouver) | Strategie, Use-Case-Design, Betriebsmodell – ausdrücklich *keine* Modellentwicklung; Business Cases, Value Realization, Workshops zur Priorisierung | Betriebsmodell-Design ist dein Alleinstellungsmerkmal |
| **TELUS Digital, Sr. Manager AI Automation Strategy** | Eingehende Anfragen nach Impact, Machbarkeit und Kapazität priorisieren | Portfolio- und Priorisierungsansicht |
| **Tidal Commerce, AI Transformation Lead** | Geschäftsziele in pragmatische Use Cases mit ROI übersetzen; Change Management inklusive Governance | Wertlogik und KPIs im Output |

**Wettbewerb:** Enterprise-Plattformen wie ServiceNow AI Control Tower decken Intake, Inventar und Risikoklassifizierung schon ab.
- **Konsequenz:** Nicht mit „noch einem Intake-Formular“ konkurrieren.
- **Deine Lücke:**
  1. das *Betriebsmodell* hinter dem Use Case (Split, Entscheidungsrechte, Koordination, Austausch, Kosten), und
  2. die *Messung nach dem Launch* (Reinforcement Pulse).

  Beides hat keine der Plattformen als Kernlogik.

---

## 3. Zielnutzer & Jobs-to-be-done (damit das Tool echten Mehrwert hat)

**Primär:** AI-CoE-Leads, AI-Enablement- und Transformation-Manager, Berater.
**Sekundär:** Product Owner von KI-Use-Cases, Privacy Officer (als Gesprächspartner).

| Job | Heute | Mit dem Tool |
|---|---|---|
| „Soll dieser Use Case weiter, und unter welchen Auflagen?“ | Mehrere Meetings, Bauchgefühl | 15-Minuten-Triage mit Quellen und Status („gilt / vorgeschlagen / Leitfaden“) |
| „Wie organisieren wir die Arbeit zwischen Mensch und KI?“ | Wird meist gar nicht entschieden → Drift | Split Map + drei Design-Karten + „Was das Design kostet“ |
| „Woran merken wir, ob es funktioniert?“ | Nur Effizienz-KPIs | Drift-Check + Learning-Loop-KPIs + Pulse |
| „Was legen wir dem Steering Committee vor?“ | Händisches Deck | 1-Page-Charter (MD/PDF) + Inventar-Eintrag (JSON) |

---

## 4. Ideen-Pitches

Du hattest um bessere Ideen gebeten. Hier sind drei Richtungen und meine Empfehlung.

### Idee A – „Splitline“: AI Operating Model Studio *(Weiterentwicklung deiner Idee)*
**Ablauf:** Intake → Claude zerlegt den Prozess in Teilaufgaben (du bestätigst) → regelbasierte kanadische Triage → Betriebsmodell nach deiner Thesis → 90-Tage-Rollout → Charter-Export → Pulse nach dem Launch.

- **Stärke:** deckt den ganzen Weg von der Idee bis zur Implementierung ab, ist thesis-treu und zeigt Kanada-Kompetenz.
- **Schwäche:** braucht disziplinierten Scope, sonst wird es breit und flach.

### Idee B – „Pulse“: Diagnose für bereits laufende KI-Lösungen
Nur der Post-Launch-Teil: Teams beantworten neun Fragen und sehen sofort ihre 2×2-Position, den nachhinkenden Treiber und den passenden Hebel mit Guardrail.

- **Stärke:** am originellsten, klein, schnell gebaut, trifft genau „zu wenig genutzte Lösungen früh erkennen“.
- **Schwäche:** wenig Kanada- und Governance-Signal; die Demo braucht synthetische Daten; zeigt nur das Ende des Lebenszyklus.

### Idee C – „Living Lab“: ein echter Human-in-the-Loop-Prototyp mit eingebautem Betriebsmodell
**Ablauf:** Ein lauffähiger KI-Workflow, etwa Dokumentenextraktion für Versicherungsschäden – das ist das Beispiel aus deiner eigenen Arbeit (Abschnitt 5.2). Dazu gehören:
- Confidence-Schwellen und eine Review-Queue;
- eine Korrektur-Erfassung, die zurück in Prompt bzw. Regeln fließt;
- ein monatlicher „Split Review“.

Das Dashboard berechnet die beiden Wirkrichtungen **aus den Event-Logs statt aus einer Umfrage**. Das ist deine Task-Episode-Messung aus 6.4, erstmals umgesetzt.

- **Stärke:** der stärkste Beweis für „vom Prototyp zur Implementierung“; technisch beeindruckend; macht die Thesis greifbar.
- **Schwäche:** größter Aufwand; die Log-Messung ist eine eigene Ableitung (muss so gekennzeichnet sein); weniger Governance-Breite.

### ⭐ Empfehlung: A als Kern + „Living Lab Lite“ als vierter Demo-Fall
- **Kern (MVP):** Idee A inklusive Pulse. Pulse kostet wenig, weil die Bewertung regelbasiert ist.
- **Living Lab Lite (zweite Ausbaustufe):** Beim Preset „Claims Document Intake“ kann man nicht nur analysieren, sondern selbst Reviewer spielen:
  - zehn synthetische Dokumente bearbeiten, Korrekturen werden geloggt;
  - die Kennzahlen A→B und B→A aktualisieren sich live;
  - am Ende schlägt der „Split Review“ vor, einen Dokumenttyp an die Maschine zu geben.

  Recruiter verstehen in zwei Minuten, was deine Masterarbeit sagt.

**Drei Ideen außerhalb des Produkts, mit hohem Hebel:**
1. **Das Tool prüft sich selbst:** Eine Seite „Self-Assessment“ zeigt die Governance-Karte des Tools.
   - **Fakt:** Die Claude-API bietet nur US- oder globale Verarbeitung; einen kanadischen Standort gibt es dort nicht.
   - **Folge:** Das Tool flaggt sich selbst bei personenbezogenen Daten. Das ist ehrlich und eine sehr gute Interview-Geschichte.
2. **Öffentliche „Canada AI Governance Map“** aus der Rechts-Wissensbasis, mit Status und „last verified“. Das ist für andere nützlich und liefert Stoff für LinkedIn.
3. **„Use-Case-Clinic“ in Vancouver:** Biete ab Ankunft (oder vorher remote) drei bis fünf Organisationen oder Meetups eine kostenlose 30-Minuten-Session mit dem Tool an.
   - Echte Nutzung schlägt jede Demo.
   - Du bekommst Referenzen und Netzwerk.
   - Das ist das stärkste Argument gegen den „Canadian Experience“-Einwand.

   Am Rande: Ontario verbietet seit 2026 die Anforderung „Canadian experience“ in Stellenanzeigen. Für BC gilt das nicht.

---

## 5. Demo-Fälle (überarbeitet)

| # | Fall | Was er zeigt | Korrektur gegenüber dem Briefing |
|---|---|---|---|
| 1 | **Clinical Referral Triage** (Health Authority, FIPPA) | Tier III, menschliche Endentscheidung, SaMD-Check, Supplementary Assessment bei Verarbeitung außerhalb Kanadas, monatlicher Split Review (GenAI = hohe Dynamik) | Keine „Data-Residency-Pflicht“ mehr (2021 abgeschafft), sondern ein Assessment für sensible Daten außerhalb Kanadas |
| 2 | **Contract Clause Review** (BC Legal-Tech, PIPA) | Produktives Both-and, Vendor Due Diligence (OPC-Entwurf), Cross-Border nach PIPEDA, C-36 als „Prepare for“ | C-36 als *vorgeschlagen* gekennzeichnet |
| 3 | **Resume Ranking + Slack Sentiment Scoring** (HR, PIPA) | Blocker beim Monitoring (laut OIPC kontinuierliche Überwachung „selten zulässig“), Human Rights Code, Quebec 12.1 bzw. Ontario-Offenlegung, falls zutreffend; Redesign in ein zulässiges Assistenz-Tool | Rechtsgrundlagen präzise statt pauschal |
| 4 | **Claims Document Intake** (BC Crown Corp, FIPPA) – *neu* | Zeigt, dass das Tool **nicht automatisierungsfeindlich** ist: hohe Automatisierung freigegeben, aber mit Lernkreislauf. Grundlage für Living Lab Lite | — |

Fall 4 ist wichtig für deine Glaubwürdigkeit: Ein Tool, das immer „Human in the Loop“ sagt, wirkt ideologisch. Deine Thesis sagt „designe für die Kopplung“, nicht „automatisiere weniger“.

---

## 6. Scope-Vorschlag

**MVP (Ziel: live bis Mitte Januar 2027, damit es in die Bewerbungen kann)**
1. Intake (Freitext + wenige Pflichtfelder) und LLM-Zerlegung in Teilaufgaben, **vom Nutzer bestätigt** (Human in the Loop als Dogfooding)
2. Regelbasierte Triage: indikatives Tier I–IV, Regeln mit Status und Quellen
3. Betriebsmodell: Split Map, drei Karten, Kostenbox, Drift-Check
4. 90-Tage-Rollout mit Monitoring- und Warnindikatoren
5. Export: Charter (MD + Druck/PDF) und Inventar-Eintrag (JSON)
6. Reinforcement Pulse (Formular, Bewertung, 2×2)
7. Vier Presets, vorgespeichert (keine API-Kosten), Seiten „Sources“ und „Self-Assessment“

**Ausbau (Februar, parallel zu den Bewerbungen)**
- Living Lab Lite (Preset 4 interaktiv)
- What-if-Schalter (Hosting-Ort, Entscheidungsrolle der KI, Quebec/Ontario betroffen …) – günstig, weil regelbasiert
- Portfolio: gespeicherte Fälle, Priorisierung nach Wert × Machbarkeit × Risiko, nächste Review-Termine

**Bewusst raus:** Login, Datenbank, Mehrbenutzerbetrieb, echte Personendaten.

---

## 7. Karriere-Packaging

- **README:** ein Satz zum Problem → Live-Link → GIF → „How it works“ (Diagramm: Regel-Engine vs. LLM) → „Thesis behind it“ → „What I'd do differently“ → Limits.
- **Zwei-Minuten-Loom auf Englisch:** Fall 3 (Blocker + Redesign), dann Fall 4 (Living Lab), dann Pulse.
- **Einseitige Case Study als PDF** fürs Bewerbungsportfolio.
- **Drei LinkedIn-Posts:**
  1. Warum 95 % scheitern – deine Thesis in 150 Wörtern
  2. Kanadas KI-Regeln Ende 2026 auf einen Blick
  3. Wie ich mit Claude Code und Evals ein Governance-Tool gebaut habe
- **Interview-Geschichten:**
  1. „Ich habe Human in the Loop auf mein eigenes Tool angewendet.“
  2. Übersetzung von der Thesis ins Produkt
  3. Wie ich Rechtsinhalte aktuell halte (Status + „last verified“)
  4. „Meine ersten 90 Tage bei euch – mit diesem Tool“
- **CV-Zeile** (korrigiert, englisch):
  > *Designed and shipped a decision-support tool that turns my M.Sc. research on the automation–augmentation paradox into AI operating-model design and post-launch measurement, with a rules-based triage engine for Canadian and BC privacy and AI governance (PIPA, FIPPA, PIPEDA, proposed Bill C-36, AIA-inspired impact tiers). Next.js, TypeScript, Claude API, evals in CI.*

---

## 8. Risiken & Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
|---|---|
| Rechtsinhalte veralten (C-36 bewegt sich, PIPA-Änderungen ab 2027) | Jede Regel mit Status und Prüfdatum; Seite „Sources“; Release-Check (C-36-Stand prüfen) |
| Wirkt wie Rechtsberatung | Wortwahl „consider / likely triggers“; Disclaimer; kein „compliant“ |
| LLM halluziniert Gesetze oder Tiers | LLM entscheidet nie über Tier oder Trigger; Nachprüfung, dass nur ausgelöste Regel-IDs zitiert werden; Evals in CI |
| API-Kosten durch Recruiter-Klicks | Presets vorgespeichert, Rate Limit, Tagesbudget-Deckel; Sonnet 5.5 kostet ca. wenige Cent pro Analyse |
| Datenschutz des Tools selbst | Hinweis „keine Personendaten eingeben“; keine Speicherung auf dem Server; Self-Assessment-Seite |
| Thesis-Inhalte öffentlich vor der Bewertung | **Vor dem Launch mit Prof. König klären**, ob und wie du die unveröffentlichte Arbeit öffentlich referenzieren darfst |
| Scope Creep | MVP-Liste oben ist verbindlich; alles andere in den Ausbau |

---

## 9. Entscheidungen, die bei dir liegen

1. ~~**Richtung**~~ → **entschieden (20.11.2026): A als Kern + Living Lab Lite (Preset 4).** Design-Details stehen in `05_living-lab-design.md`.
2. ~~**Name**~~ → **entschieden (20.11.2026): Splitline** – „Design where the machine ends and judgment begins.“
3. **Vierter Demo-Fall** (Claims Intake) – ja oder nein?
4. **Timing:** MVP bis Mitte Januar realistisch neben dem Thesis-Abschluss?

---

## Quellen
- MIT-NANDA-Zusammenfassung (Fast Company): https://www.fastcompany.com/91402410/why-most-in-house-ai-pilots-fail
- MIT NANDA „GenAI Divide“, Analyse: https://sista.ai/pt/insights/why-ai-pilots-fail-mit-study
- AI Enablement & Engagement Lead, Vancouver: https://ai-search.io/job-board/affinity-ai-enablement-engagement-lead-20260403
- EY Manager AI Adoption & Enablement, Vancouver: https://careers.ey.com/ey/job/Vancouver-Canada-Tax-Technology-Group-%28CTTG%29-Manager%2C-AI-Adoption-&-Enablement-Vancouver-Brit-V6E-4E5/1444867033/
- KPMG Senior Manager AI Strategy, Vancouver: https://hirenata.com/jobs/d602c311-64a2-4f38-afc2-71927ec322ba
- TELUS Digital Sr. Manager AI Automation Strategy: https://job-boards.greenhouse.io/willowtree/jobs/8138883002
- Tidal Commerce AI Transformation Lead: https://builtinvancouver.org/job/ai-transformation-lead/8267672
- ServiceNow AI Control Tower, Intake: https://www.servicenow.com/docs/r/Z61H6JNUJXKe8NNPQzK7MQ/CJRJMLq71K1PdHQT4sPpAA
- Portfolio-Strategien für Recruiter: https://aitechconnect-976.pages.dev/tips/ai-engineer-proof-of-work-portfolio
- Ontario-Regeln für Stellenanzeigen 2026: https://www.mondaq.com/canada/employee-benefits-compensation/1729652/ontarios-new-job-posting-and-hiring-transparency-rules-in-force-as-of-january-1-2026
