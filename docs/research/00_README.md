# Research-Dossier: Splitline – AI Operating Model Studio + Living Lab Lite

**Stand:** 20.11.2026 · **Richtung entschieden:** Idee A als Kern + Living Lab Lite (Claims Document Intake)

## Inhalt
| Datei | Sprache | Wofür |
|---|---|---|
| `01_legal-landscape-canada-bc.md` | EN | Rechts-Wissensbasis: Statuslogik, Regelkatalog (jetzt inkl. Versicherung, Haftung, Barrierefreiheit), aufgelöste und offene Prüfpunkte, Quellen |
| `02_thesis-to-product-mapping.md` | EN | Fidelity-Regeln und Entscheidungslogik aus der Masterarbeit (verbindlich) |
| `03_produktstrategie-und-ideen.md` | DE | Positionierung, Marktbelege, Ideen, Scope, Karriere-Packaging |
| `04_architecture-notes.md` | EN | Tech-Stack, Engine vs. LLM, Evals, API- und Plattform-Fakten |
| `05_living-lab-design.md` | EN | **Neu:** Szenario, synthetische Dokumente, Pipeline, Anti-Automation-Bias-Review, Kodifizierung, Log-Metriken (A→B / B→A), Demo-Modi |
| `06_ux-ui-guidelines.md` | EN | **Neu:** Designprinzipien, Informationsarchitektur, Komponenten, visuelle Richtung, Content Design, WCAG 2.2 AA, Ablauf mit Claude Design |
| `07_build-checkliste.md` | DE | **Neu:** Checkliste „Nichts übersehen“ (Erlaubnisse, Accounts, API-Fakten, Recht, Evals, Betrieb, Packaging) |

## So nutzt du das mit Claude Code
1. Lege alles unter `docs/research/` im neuen Repo ab.
2. Lass Claude im Plan Mode per Interview ein `SPEC.md` schreiben, mit Verweis auf diese Dateien.
3. Mach Designsystem und Kernscreens in Claude Design und übergib sie per Handoff an Claude Code.
4. Baue in frischen Sessions phasenweise nach `PLAN.md`. Den Plan erstellen wir als Nächstes.

## Neue Kernbefunde dieser Runde
1. **Citations und Structured Outputs schließen sich in der Claude-API aus.** Die Extraktion wird über ein `sourceQuote`-Feld plus Serverprüfung geerdet.
2. **Konfidenz nicht vom Modell abfragen.** Ein sicherer Auto-Accept-Wert muss aus externen Signalen kommen (Validierung, Erdung, Dokumentqualität), kalibriert über QA-Stichproben.
3. **QA-Stichprobe als Blindeingabe** ist der wichtigste Hebel gegen Automation Bias und liefert die ehrliche Fehlerquote.
4. **Die Log-Metriken für A→B und B→A lassen sich 1:1 auf die Items in Tabelle 5 abbilden.** Damit misst das Lab deine Reinforcement auf zwei Wegen: Umfrage und Logs.
5. **DADM Appendix C bestätigt:** ab Tier III braucht es menschliche Eingriffspunkte und eine menschliche Endentscheidung.
6. **BC PIPA hat weiterhin keine Meldepflicht bei Datenpannen.** Die PIPA-Änderungen ab 1.8.2027 stammen aus einem Verbraucherschutzgesetz, nicht aus einer KI-Reform.
7. **Claude Design gehört nach der Spec und vor den UI-Build.** Die Engine kann parallel entstehen.
