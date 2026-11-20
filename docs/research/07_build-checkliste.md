# Build-Checkliste: „Nichts übersehen“

**Stand:** 20.11.2026 · Alles, was vor und während des Baus geklärt sein muss. Kein Businessplan, sondern eine Liste zum Abhaken.

---

## A. Vorab klären (blockierend)
- [ ] **Prof. König fragen**, ob und wie du die (noch unbewertete) Masterarbeit öffentlich referenzieren darfst: Titel, Kernaussagen, Tabellen 4/5 im Tool.
- [x] **Name:** Splitline (entschieden 20.11.2026). Offen: Domain, GitHub- und LinkedIn-Handle prüfen (optional; eine `vercel.app`-Subdomain reicht für den Start).
- [ ] **Lizenz:** MIT für den Code. Für `docs/` (Rechts-Wissensbasis) z. B. CC BY 4.0, mit Hinweis „not legal advice“.
- [ ] **Fiktive Organisationen** in allen Presets, keine echten Marken. Gilt besonders für Preset 4: kein ICBC-Name, -Logo, -Formular oder -Gebührenplan.

## B. Accounts & Kosten
- [ ] **Anthropic Console:** eigener Workspace „split-demo“, API-Key nur serverseitig, **eigenes Spend Limit** (z. B. 20–30 USD/Monat).
  - Neue Organisationen können in einem *Evaluation tier* mit niedrigeren Limits starten.
  - Beim Erreichen der Monatsobergrenze antwortet die API mit 429 **ohne** `retry-after`. Das muss die App erkennen und auf die gecachten Ergebnisse umschalten.
- [ ] **Vercel Hobby:** kostenlos, laut Bedingungen nur für nicht-kommerzielle Nutzung. Ein persönliches Portfolio passt. Funktionen laufen standardmäßig bis zu 300 s (Fluid Compute). Web Analytics: 50.000 Events/Monat inklusive, cookielos.
- [ ] **Upstash Redis** für das Rate Limiting. Der Free Tier reicht; die Quellen nennen unterschiedliche Grenzen (10.000 Befehle/Tag bzw. 500.000/Monat), also vor dem Launch auf der Pricing-Seite prüfen.
- [ ] **GitHub:** öffentliches Repo, saubere Commit-Historie (Recruiter schauen hin), README zuerst.

## C. API-Fakten, die das Design bestimmen
- [ ] **Modell:** `claude-sonnet-5-5` (2 / 10 USD pro MTok), Modell-ID fest gepinnt.
- [ ] **Structured Outputs:** über `messages.parse()` + `zodOutputFormat()`.
  - Kein `minimum`/`maximum`/`minLength`, kein `oneOf`.
  - Der Helper verschiebt Constraints in die Beschreibung und prüft lokal nach.
- [ ] **Citations und Structured Outputs sind inkompatibel** (400). Deshalb erden wir die Extraktion über ein `sourceQuote`-Feld und eine serverseitige Prüfung.
- [ ] **PDF:** ca. 1.500–3.000 Text-Tokens plus max. 1.568 Bild-Tokens pro Seite. Belege sind 1-seitig → günstig.
- [ ] **Prompt Caching** für System-Prompt und Regelkontext. Gecachte Lese-Tokens zählen nicht gegen das ITPM-Limit.
- [ ] **Datenstandort:** `inference_geo` nur `us`/`global`, kein Kanada. Das steht auf der Self-Assessment-Seite.
- [ ] **Fehlerbehandlung:** 429 Rate Limit (mit `retry-after`), 429 Ramp Limit (`ramp_limit_exceeded`), 429 Spend Cap (`enforced_spend_limit_reached`, ohne Retry) → immer auf gecachte Ergebnisse zurückfallen.

## D. Inhalte & Recht
- [ ] **Regel-Engine:** jede Regel mit `status`, `sources[]` und `lastVerified`. Bevor Claude Code Regeln baut, prüfst du den Regelkatalog in `01_…` und bestätigst ihn.
- [ ] **Microcopy:** „likely triggers / consider / prepare for“; Disclaimer auf jedem Ergebnis.
- [ ] **Keine Personendaten:** Banner im Intake; **Uploads im MVP deaktiviert** (nur synthetische Lab-Dokumente). Das senkt das Prompt-Injection- und Datenschutzrisiko.
- [ ] **Release-Check vor jedem Deployment:**
  - Stand von C-36 auf LEGISinfo
  - finale OPC-Vendor-Guidance (nach dem 4.12.2026)
  - PIPA-Änderungen zum 1.8.2027
  - neue OIPC-BC-Guidance
- [ ] **Thesis-Treue:** `02_…` ist verbindlich. Minimum Rule = min(A→B, B→A); Hinweise „illustrative, not validated“.

## E. Qualität & Evals
- [ ] **Engine:** Golden Cases (ca. 12) als Snapshot-Tests.
- [ ] **Lab-Extraktion:** Feldgenauigkeit gegen die synthetische Ground Truth, je Dokumenttyp. Dazu eine Kalibrierungskurve (Anteil korrekt je Signalkombination).
- [ ] **LLM-Zerlegung:** Schema-Validität, Pflichtattribute, Stabilität über 3 Läufe.
- [ ] **Narration:** zitiert keine Regel, die nicht ausgelöst wurde.
- [ ] **Playwright:** ein End-to-End-Pfad je Preset, Screenshots der Kernscreens, PDF-Snapshot der Charter.
- [ ] **Barrierefreiheit:** axe-Check in CI plus ein manueller Screenreader-Durchlauf.
- [ ] **CI-Gate:** Typecheck + Tests + a11y müssen grün sein (Hook bzw. GitHub Action).

## F. UX
- [ ] Erst Spec, dann **Claude Design** (Designsystem + 5 Kernscreens), dann der UI-Build per Handoff (siehe `06_…`, §8).
- [ ] 5-Sekunden-Test mit 3 Personen und ein Think-Aloud mit jemandem aus der Zielrolle.
- [ ] Mobil lesbar: Landing, Summary, Lab-Dashboard.
- [ ] Kanadisches Englisch durchgängig (Liste in `06_…`, §5).

## G. Betrieb
- [ ] **Rate Limit:** etwa 10 Live-Analysen pro IP und Stunde plus ein globales Tageslimit (Env-Variable).
- [ ] **Logging:** nur Zähler, Latenzen, Fehlercodes; keine Request-Inhalte.
- [ ] **Analytics:** cookielos (Vercel Web Analytics). Custom Events: Preset geöffnet, Charter exportiert, Lab-Autoplay gestartet → zeigt dir, was Recruiter wirklich ansehen.
- [ ] **Monitoring:** Fehler-Alerts per E-Mail (Vercel); vor jedem Interview prüfen, ob die Demo läuft.

## H. Karriere-Packaging (parallel zum Bau, nicht danach)
- [ ] README nach der Vorlage in `03_…`, §7; Architekturdiagramm (Engine vs. LLM).
- [ ] 2-Minuten-Loom auf Englisch: Preset 3 (Blocker) → Lab-Autoplay („Rubber-stamp vs. Coupled team“) → Pulse.
- [ ] Einseitige Case Study (PDF), 3 LinkedIn-Posts, CV-Zeile.
- [ ] „Use-Case-Clinic“-Angebot formulieren (für Vancouver-Meetups und Informational Interviews).

## I. Ehrlichkeit (in UI und README sichtbar)
- [ ] „Indicative triage, not legal advice.“
- [ ] „Thesis propositions are untested; Pulse items and Lab metrics are illustrative.“
- [ ] „Lab metrics are my own log-based operationalization of the thesis's task-episode idea.“
- [ ] „All organizations and documents are fictional.“
