# Canadian & BC AI Governance Knowledge Base

**Last verified:** 2026-11-20 · **Purpose:** source material for the tool's deterministic rules engine and its "Sources" page · **Not legal advice.**

> Hinweis für Juju: Diese Datei ist bewusst auf Englisch, weil sie 1:1 in die (englische) App und die Regel-Engine einfließt. Jede Aussage hat eine Quelle; Punkte, die ich nicht an einer Primärquelle prüfen konnte, stehen unter „Open verification items“.

---

## 0. How the tool should use this file

Every rule in the engine carries a **status**. The UI must never present a proposed bill or a guidance document as binding law.

| Status | Meaning | UI wording |
|---|---|---|
| `IN_FORCE` | Binding law currently in effect | "Applies" |
| `IN_FORCE_FUTURE` | Enacted, effective date in the future | "Applies from <date>" |
| `PROPOSED` | Bill before a legislature | "Prepare for (proposed)" |
| `REGULATOR_GUIDANCE` | Non-binding, but shows how the regulator reads the law | "Regulator expects" |
| `GOVERNMENT_POLICY` | Binding only on government bodies | "Mandatory for <scope>; reference elsewhere" |
| `VOLUNTARY` | Voluntary code or standard | "Good practice" |
| `REFERENCE` | Used as a benchmark outside its legal scope | "Reference framework" |

Each rule object: `id`, `jurisdiction`, `instrument`, `status`, `appliesWhen` (predicate over intake fields), `consideration`, `actionsToConsider[]`, `sources[]`, `lastVerified`.

Wording rules for outputs: use "consider", "assess", "likely triggers"; never "compliant" or "mandatory action". Final line on every output: *"Indicative triage only, not legal advice. Confirm with your privacy office or counsel."*

---

## 1. The big picture (November 2026)

- **There is no federal AI statute.** AIDA (Part 3 of Bill C-27) died when Parliament was prorogued in January 2025. The national strategy *AI for All* (announced June 4, 2026) handles AI risk through targeted laws (privacy, online safety), not through a comprehensive AI act.
- **Federal privacy reform is pending.** Bill C-36 (*Protecting Privacy and Consumer Data Act*, PPCDA) was introduced June 15, 2026 and was at second reading as of October 2026. **PIPEDA still governs.**
- **British Columbia has no AI-specific statute.** The governing laws are BC PIPA (private sector) and BC FIPPA (public sector), plus regulator guidance from the OIPC BC.
- **Regulators are active on AI.** Examples: the joint OPC/CAI/OIPC-BC/OIPC-AB findings on ChatGPT (May 6, 2026); OIPC BC's AI-scribe guidance (Jan 28, 2026); OIPC BC opened a new OpenAI investigation (Oct 27, 2026); OPC draft vendor due-diligence guidance (Sept 10, 2026).

---

## 2. Instruments

### 2.1 PIPEDA (federal) — `IN_FORCE`
- Applies to commercial activity of federally regulated organizations and to personal information that crosses provincial or national borders. Within BC, BC PIPA applies to in-province processing.
- **Accountability for processors:** organizations stay accountable for personal information they transfer to a third party for processing.
- **OPC draft guidance on assessing third-party service providers** (Sept 10, 2026; comments until Dec 4, 2026). It tells organizations to assess a vendor *before* procurement. New: if the vendor's technology relies on training data, ask where that data came from and whether it was collected lawfully. → Direct input for an "LLM vendor due diligence" control.
- **Joint ChatGPT findings (PIPEDA Findings #2026-002, May 6, 2026):** consent to "service improvement" was not accepted as covering AI training. OIPC-BC and OIPC-AB held that their provincial PIPAs have no implied-consent concept and require more specific forms of consent.

### 2.2 Bill C-36 — PPCDA (federal) — `PROPOSED`
Would repeal Part 1 of PIPEDA and replace it.
- **Automated decision systems (s. 63):** the definition is broad and covers rules-based systems, regression, predictive analytics and ML. For predictions, recommendations or decisions with a *legal or similarly significant effect*: on request, explain the personal information used, its source and the main factors. Individuals can make representations to an employee who can review the decision.
- **Cross-border (s. 57):** a privacy impact assessment and mitigation measures are required *before* transferring personal information outside Canada. The assessment must be available to the regulator on request.
- **Service providers:** defined in the Act; equivalent protection is required by contract or otherwise. A provider that uses data for its own purposes becomes accountable itself.
- **Legitimate interest:** requires a documented PIA as a precondition.
- **Behavioural influence** (targeted advertising, personalized pricing) cannot rely on the business-activities exception or on legitimate interest. In effect this means express consent.
- **Penalties:** administrative penalties up to the greater of $10M or 3% of global revenue. Serious offences up to $25M or 5%.
- **Regulator:** a new Digital Safety and Data Protection Commission, created through a separate bill (C-34), would replace the OPC.
- **No AI statute inside C-36.** It deals only with privacy, plus the automated-decision provisions above.

### 2.3 BC PIPA — `IN_FORCE`
- Applies to private-sector organizations and non-profits in BC. The BC Court of Appeal confirmed (Clearview AI) that PIPA reaches foreign organizations with a real and substantial connection to BC.
- **Consent forms:** express, deemed, or notice-based (opt-out). The joint ChatGPT findings stress that there is no implied consent.
- **Reasonable-purpose test** for collection, use and disclosure.
- **Employee personal information** (to verify: ss. 13, 16, 19): may be collected, used or disclosed without consent if it is reasonable for establishing, managing or ending the employment relationship and the employee is notified. If information is *not* collected solely for that purpose (for example, surveillance with mixed purposes), normal consent rules apply (OIPC Investigation Report P17-01).
- **OIPC on employee monitoring:** ongoing, continuous and routine monitoring of employee behaviour will seldom be authorized. Covert monitoring has a very high justification threshold. Off-the-shelf tools with default settings are not automatically compliant.
- **AI scribes (OIPC guidance, Jan 28, 2026):** consent is needed in almost all clinical situations, and AI-generated content needs human review. The guidance also covers employees' own personal information captured by the scribe.
- **Pending changes:** SBC 2025, c. 31 is the *Business Practices and Consumer Protection Amendment Act (No. 2), 2025* (Bill 28, assented Dec 3, 2025). It amends PIPA ss. 1, 9, 23, 24, 24.1 (new), 26, 32, 36, 37 and 56, in force **August 1, 2027** (BC Reg 126/2026). These are consequential amendments from a consumer-protection statute, not an AI or breach-notification reform. Section wording still unread (BC Laws blocks automated fetching).
- **No mandatory breach notification** under BC PIPA (confirmed): the OIPC keeps calling for it. The s. 34 duty of reasonable security still applies.

### 2.4 BC FIPPA (public sector, including health authorities and Crown corporations) — `IN_FORCE`
- **The data-residency prohibition was removed in 2021** (Bill 22). Under s. 33.1, public bodies may disclose personal information outside Canada in accordance with the regulations.
- **Personal Information Disclosure for Storage Outside of Canada Regulation (B.C. Reg. 294/2021):** each program, project or system in which *sensitive* personal information is disclosed to be stored outside Canada needs an **additional assessment** (a "supplementary assessment", part 4 of the provincial PIA template). The result is a risk-based decision by the head of the public body. The regulation does not define "sensitive"; the public body must assess it.
- **s. 30 (reasonable security)** still applies to any disclosure outside Canada. OIPC guidance expects an assessment of the foreign legal framework and accepts that some risks cannot be fully eliminated.
- **PIAs** are part of the regime for new initiatives (Ministerial PIA directions for ministries and for non-ministry bodies). There is also a privacy management program requirement.
- **Bill 9 (FIPPA Amendment Act, 2026)**, royal assent May 28, 2026. It mainly changes access-request handling and adds "connected services providers" for information sharing between public bodies. It contains no AI-specific rules.
- **BC Public Service generative AI policy:** confidential or personal information may go into approved enterprise tools (for example Copilot Chat under the government's agreement), but never into public gen-AI tools such as ChatGPT. This binds the public service; health authorities have their own policies.
- **BC oversight offices** (OIPC, Ombudsperson, Human Rights Commissioner) have recommended a mandatory *AI Fairness and Privacy Impact Assessment* for public bodies. This is a recommendation, not law → `REFERENCE`.

### 2.5 Federal public sector: Directive on Automated Decision-Making (DADM) + AIA — `GOVERNMENT_POLICY` (federal); `REFERENCE` everywhere else
- Applies to federal institutions using automated systems that make or support administrative decisions about clients. Systems in production only.
- **4th review** in force June 24, 2025. Systems that already existed had until June 24, 2026 to comply. Reviewed every two years.
- **AIA mechanics:**
  - 65 risk questions in six areas (max raw impact score 169) and 41 mitigation questions (max 77).
  - If the mitigation score is ≥ 80% of its maximum, 15% is deducted from the raw impact score.
  - Levels by percentage: **I = 0–25%, II = 26–50%, III = 51–75%, IV = 76–100%.**
  - Factors: rights and freedoms, health and well-being, economic interests, environmental sustainability, reversibility and duration, operating context and data risk.
- **Peer review** is required at impact level 2 or higher.
- **Human involvement (Appendix C, confirmed via archived text and secondary sources):** at Levels I and II, decisions may be made without direct human involvement. At Levels III and IV, there must be specific human intervention points, and **the final decision must be made by a human**.
- **Reversibility anchors:** Level I impacts are typically reversible and brief; Level II likely reversible and short-term; Level III often difficult to reverse; Level IV often irreversible and perpetual. → Use these as anchors for the `reversibility` input.
- **Guide on the Use of Agentic AI** (TBS, May 2026): use agentic AI in tightly scoped internal workflows with limited permissions; accountable public servants make the final decisions and authorize consequential actions.
- **Tool implication:** call our tier an **"AIA-inspired indicative impact tier"**, never an official AIA. Reuse the four levels, the factor list and the percentage thresholds. Do not claim to reproduce the 65-question tool.

### 2.6 Voluntary Code of Conduct on Advanced Generative AI Systems (ISED, Sept 2023) — `VOLUNTARY`
- Six principles: Accountability, Safety, Fairness & Equity, Transparency, Human Oversight & Monitoring, Validity & Robustness.
- It separates **developers** from **managers** (deployers) and all advanced generative systems from publicly available ones. A company deploying an LLM internally is a *manager*. Narrow, low-risk tools such as grammar checkers are out of scope.
- Signatories include CGI, CIBC, TELUS, Salesforce, SAP Canada, Vector Institute and others.
- Tool: a checklist for the manager role. Status labels: "Control in place / Action needed / Blocker".

### 2.7 OSFI Guideline E-23 Model Risk Management (2027) — `IN_FORCE_FUTURE` (May 1, 2027)
- Applies to all federally regulated financial institutions. The final guideline was published Sept 11, 2025.
- Covers any model that "processes input data to generate results", explicitly including AI/ML.
- Expects an enterprise model inventory, risk-based proportionality, and third-party model management together with Guideline B-10.
- It is a supervisory guideline, not a statute: no fines, but supervisory findings.

### 2.8 Employment and hiring
- **BC Human Rights Code:** discriminatory outcomes of algorithmic hiring or performance decisions are actionable even without an AI statute. → Bias testing and adverse-impact review.
- **Ontario ESA (Working for Workers Four Act, O. Reg. 476/24)**, in force Jan 1, 2026: employers with 25 or more employees must disclose in publicly advertised job postings (and the application form) if AI is used to screen, assess or select applicants. The same package bans "Canadian experience" requirements in postings. Only relevant if roles are posted in Ontario.
- **Quebec Law 25, s. 12.1** (since Sept 22, 2023): for decisions based *exclusively* on automated processing of personal information, the organization must:
  - inform the person no later than when the decision is communicated;
  - on request, explain the personal information used, the reasons and the principal factors;
  - offer the right to have the information corrected and to submit observations to a person who can review the decision.

  Meaningful human review takes a decision out of scope; a pro-forma sign-off likely does not. Relevant if Quebec residents are affected.

### 2.9 Health products: Health Canada Software as a Medical Device (SaMD)
- The SaMD guidance (2019) defines when software is a medical device. Exclusions include software for administrative support or scheduling, and decision-support software that only supports a health professional without replacing clinical judgement (subject to the exclusion criteria).
- Risk class comes from the significance of the information (treat or diagnose / drive / inform clinical management) combined with the state of the condition (critical / serious / non-serious).
- The pre-market guidance for machine-learning-enabled medical devices was finalized in Feb 2025.
- **CDS exclusion criteria (Health Canada SaMD guidance, 2019):** all four must be met for decision-support software to fall outside the Regulations:
  1. It does not acquire, process or analyze medical images or signals.
  2. It is intended to display, analyze or print patient medical information or reference material (verify the exact wording on the official page).
  3. It only *supports* decisions (informs management), rather than treating, diagnosing or driving management.
  4. It does not replace clinical judgement, and the professional can see the basis of the recommendation and review it independently.
- **Always excluded:** administrative support, clinical communication and workflow (registration, scheduling), wellness, and EHR/patient-access tools.
- **Risk class:** a matrix of situation (critical / serious / non-serious) × significance (treat or diagnose / drive / inform). Example: critical + drive → Class III; inform → I or II.
- Tool: any use case that **prioritizes, triages or recommends clinical action** gets a "SaMD classification check" flag, with the four criteria as a checklist. Pure scheduling or administration does not.

### 2.10 Standards — `VOLUNTARY`
- **ISO/IEC 42001** (AI management system): clause 6.1.4 requires an AI system impact assessment process; clause 8.4 requires performing it and keeping the results.
- **ISO/IEC 42005:2025** (published May 2025): guidance on the content of an AI system impact assessment. Not certifiable. It recommends assessments at design, at deployment and at significant change.
- Tool: export an inventory record and a 42005-style impact summary.

### 2.11 LLM vendor facts that drive the cross-border rule (Claude API, verified 2026-11-20)
- `inference_geo` accepts only `"global"` or `"us"`; workspace (storage) geo is `"us"` only. **There is no Canadian inference location on the first-party API.**
- US-only inference costs 1.1× on current models. Zero data retention and HIPAA readiness are available as arrangements.
- Consequence: any use case that sends BC personal information to the Claude API (or most US-hosted LLM APIs) involves processing outside Canada. Cloud-partner regional endpoints (Bedrock, Google Cloud) follow their own regions and must be checked case by case.

### 2.12 Insurance & financial conduct (relevant to the claims preset)
- **BCFSA Insurer Code of Market Conduct** (insurers had to adopt it by April 1, 2024): fair-treatment principles for BC-authorized insurers → `REGULATOR_GUIDANCE`. BCFSA also published its own version of OSFI B-10 (third-party risk) and an information-security incident reporting guideline (effective Jan 1, 2026).
- **OSFI bulletin on generative and agentic AI** (July 2026): sound practices for federally regulated institutions, including insurers → `REGULATOR_GUIDANCE` (FRFIs only). Together with E-23 from May 2027.
- **Quebec AMF Guideline for the Use of AI:** effective May 1, 2027; explainability and fair treatment of clients → `IN_FORCE_FUTURE` for Quebec-regulated financial institutions.
- Our claims preset uses a **fictional BC public (Crown) auto insurer** → FIPPA applies. Fair-treatment expectations are a `REFERENCE`.

### 2.13 Liability for AI outputs
- **Moffatt v. Air Canada** (BC Civil Resolution Tribunal, 2024): a company was held responsible for its customer-facing chatbot's misstatement. → Rule `LIAB-CUSTFACING`: customer-facing generative output → accuracy controls, disclaimers alone are not enough, escalation path.

### 2.14 Accessibility (applies to the tool itself and to public-sector use cases)
- **Accessible Canada Act:** for federally regulated organizations, the digital standard CAN/ASC-EN 301 549 (embeds WCAG 2.1 AA; a WCAG 2.2 update is expected). Website deadlines are phased toward 2028.
- **Accessible British Columbia Act:** applies to BC government and public-sector organizations, not (yet) to private businesses.
- Tool decision: build to **WCAG 2.2 AA** (it covers 2.1 AA).

---

## 3. Draft rule catalogue (input for the engine)

| ID | Trigger (intake predicate) | Status | Output (consideration → action) |
|---|---|---|---|
| `BC-PIPA-01` | sector = BC private AND data includes personal info | IN_FORCE | Reasonable purpose + valid consent form (express / deemed / notice; no "implied") → document purpose, choose consent form, update notices |
| `BC-PIPA-EMP` | data includes employee info AND purpose = managing employment | IN_FORCE | May proceed without consent if reasonable + notified → notification, proportionality analysis |
| `BC-PIPA-MON` | function = HR AND (monitoring OR productivity/sentiment scoring) | REGULATOR_GUIDANCE | Continuous routine monitoring "seldom authorized"; covert = very high bar → **Blocker unless redesigned** |
| `BC-FIPPA-01` | sector = BC public body | IN_FORCE | PIA for new initiative; s. 30 security |
| `BC-FIPPA-XB` | BC public body AND sensitive PI AND processing/storage outside Canada (e.g., US LLM API) | IN_FORCE | Supplementary assessment (PIA Part 4), risk-based decision by head of public body; assess foreign legal framework |
| `BC-GOV-GENAI` | BC Public Service AND tool = public gen-AI | GOVERNMENT_POLICY | No confidential/personal info in public tools; use approved enterprise tools |
| `FED-PIPEDA-XB` | private sector AND PI leaves province/Canada in commercial activity | IN_FORCE | Processor accountability; contractual protections; vendor due diligence |
| `FED-OPC-VENDOR` | uses third-party AI vendor/model | REGULATOR_GUIDANCE (draft) | Pre-procurement assessment incl. training-data provenance, retention, ZDR |
| `FED-C36-ADM` | AI makes/supports decisions about individuals with legal or similarly significant effect | PROPOSED | Prepare explanation capability + human review channel |
| `FED-C36-XB` | PI transferred outside Canada | PROPOSED | Prepare pre-transfer PIA + mitigation |
| `QC-L25-121` | Quebec residents affected AND decision exclusively automated | IN_FORCE | Notice + explanation on request + human review route; or ensure meaningful human review |
| `ON-ESA-AI` | hiring AND postings in Ontario AND ≥25 employees | IN_FORCE | AI disclosure in posting and application form |
| `BC-HRC-01` | hiring / promotion / performance / eligibility decisions | IN_FORCE | Adverse-impact / bias testing, documented rationale |
| `HC-SAMD-01` | health AND AI prioritizes/triages/recommends clinical action | IN_FORCE (regulatory classification) | SaMD classification check vs exclusion criteria |
| `BC-OIPC-SCRIBE` | health AND ambient recording/transcription | REGULATOR_GUIDANCE | Consent in almost all clinical situations; human review of AI notes |
| `FED-DADM-01` | federal institution AND administrative decision | GOVERNMENT_POLICY | Official AIA, peer review (level ≥2), notice, explanation |
| `REF-AIA-TIER` | always | REFERENCE | AIA-inspired indicative tier I–IV with rationale |
| `VC-GENAI-MGR` | uses advanced generative AI | VOLUNTARY | Six-principle checklist (manager role) |
| `OSFI-E23` | federally regulated financial institution | IN_FORCE_FUTURE (2027-05-01) | Model inventory, risk rating, validation, third-party model mgmt |
| `ISO-42001` | always (export) | VOLUNTARY | Inventory record + impact-assessment summary (42005-style) |
| `FED-DADM-HITL` | indicative tier ≥ III | REFERENCE (GOVERNMENT_POLICY for federal) | Human intervention points + human final decision |
| `INS-FAIR` | insurer AND AI affects claims/underwriting/customers | REGULATOR_GUIDANCE / REFERENCE | Fair-treatment review, explainability to customers, complaint path |
| `INS-OSFI-GENAI` | FRFI AND generative or agentic AI | REGULATOR_GUIDANCE | Apply OSFI July 2026 sound practices; link to E-23 |
| `QC-AMF-AI` | Quebec-regulated financial institution | IN_FORCE_FUTURE (2027-05-01) | AMF AI guideline: governance, explainability, fair treatment |
| `LIAB-CUSTFACING` | customer-facing generative output | REFERENCE (case law) | Accuracy controls, human escalation; organization owns chatbot statements |

---

## 4. Open verification items (before go-live)

Resolved on 2026-11-20:
- ✅ SBC 2025, c. 31 identified (consumer-protection amendments, in force Aug 1, 2027). Still open: read the section text.
- ✅ DADM Appendix C human-involvement rule confirmed.
- ✅ No breach-notification duty under BC PIPA confirmed.
- ✅ SaMD criteria captured (criterion 2 wording still to verify).

Still open:
1. **BC PIPA employee-information sections** (13/16/19): confirm against the statute text.
2. **Bill C-36 stage:** check LEGISinfo before every release. A Charter Statement was tabled Aug 19, 2026; the bill had not cleared committee as of the last check.
3. **OPC vendor guidance:** draft until Dec 4, 2026; re-check for the final version.
4. **SaMD criterion 2 wording** on the official Health Canada page.
5. **PIPA amendments of Aug 1, 2027:** read the text once it is available in consolidated form.

---

## 5. Sources

- Gowling WLG, Understanding Bill C-36 (2026): https://gowlingwlg.com/en/insights-resources/articles/2026/understanding-bill-c36
- DLA Piper, Canada tables Bill C-36 (June 2026): https://www.dlapiper.com/en-ie/insights/publications/2026/06/canada-tables-bill-c36-the-protecting-privacy-and-consumer-data-act
- Osler, PPCDA key obligations: https://www.osler.com/en/insights/reports/the-protecting-privacy-and-consumer-data-act-bill-c-36-key-obligations-and-enforcement-overview/
- Kukie, PIPEDA → C-36 status (Oct 2026): https://kukie.io/blog/preparing-for-canadas-privacy-law-reform-pipeda-to-cppa
- Canada.ca, AI for All announcement (June 5, 2026): https://www.canada.ca/en/innovation-science-economic-development/news/2026/06/minister-solomon-highlights-canadas-national-artificial-intelligence.html
- Chambers, Doing Business in Canada 2026 (AI regulation): https://chambers.com/practice-guides/guides/doing-business-in-2026/canada/trends-and-developments
- BC Laws, PIPA table of legislative changes: https://www.bclaws.gov.bc.ca/civix/document/id/lc/statreg/e4tlc03063
- OIPC BC guidance list: https://www.oipc.bc.ca/resources/
- OIPC BC, AI scribes news release (Jan 28, 2026): https://www.oipc.bc.ca/documents/news-releases/3083
- OIPC BC, employee monitoring guidance: https://oipc.bc.ca/guidance-documents/1807
- Mondaq, P17-01 surveillance report: https://webiis08.mondaq.com/canada/privacy-protection/647158/chicken-caught-privacy-commissioner-confirms-video-surveillance-should-be-last-resort-for-organizations
- Gowling, joint OpenAI investigation takeaways: https://gowlingwlg.com/en/insights-resources/articles/2026/practical-compliance-guide-ai-developers
- Digital Policy Alert, OIPC BC OpenAI investigation (Oct 2026): https://digitalpolicyalert.org/event/45137
- Gov BC, FIPPA s. 33.1: https://www2.gov.bc.ca/gov/content/governments/services-for-government/policies-procedures/foippa-manual/disclosure-outside-canada
- Gov BC, guidance on disclosures outside Canada: https://www2.gov.bc.ca/gov/content/governments/services-for-government/information-management-technology/privacy/privacy-impact-assessments/guidance-on-disclosures-outside-of-canada
- OIPC BC, s. 30 guidance on disclosure outside Canada: https://oipc.bc.ca/guidance-documents/3646
- Gowling, Bill 9 FIPPA (2026): https://gowlingwlg.com/en/insights-resources/articles/2026/british-columbia-modernizes-freedom-of-information-and-public-sector-access-regime
- BC Gov, generative AI policy: https://digital.gov.bc.ca/ai/gen-ai-policy/
- BC Human Rights Commissioner, joint call on AI: https://bchumanrights.ca/news-and-events/news/b-c-independent-oversight-offices-urge-public-consultation-legislative-reform-on-use-of-artificial-intelligence
- Canada.ca, Algorithmic Impact Assessment tool: https://www.canada.ca/en/government/system/digital-government/digital-government-innovations/responsible-use-ai/algorithmic-impact-assessment.html
- Canada.ca, Guide to peer review: https://www.canada.ca/en/government/system/digital-government/digital-government-innovations/responsible-use-ai/automated-decision-making/guide-peer-review-automated-decision-systems.html
- TBS, DADM: https://www.tbs-sct.canada.ca/pol/doc-eng.aspx?id=32592
- Canada.ca, Guide on the Use of Agentic AI: https://www.canada.ca/en/government/system/digital-government/digital-government-innovations/responsible-use-ai/generative-ai/guide-use-agentic-artificial-antelligence.html
- ISED, Voluntary Code of Conduct: https://ised-isde.canada.ca/site/ised/en/node/181
- OSFI, E-23 (2027) letter: https://www.osfi-bsif.gc.ca/en/guidance/guidance-library/guideline-e-23-model-risk-management-2027-letter
- Osler, Ontario AI hiring disclosure: https://www.osler.com/en/insights/blogs/employment-and-labour-law-blog/ai-in-hiring-ontario-employers-grappling-with-new-job-posting-disclosure-requirement/
- Quebec Law 25 s. 12.1 overview: https://secureprivacy.ai/blog/quebec-law-25-automated-decision-making
- Health Canada, SaMD classification examples: https://www.canada.ca/en/health-canada/services/drugs-health-products/medical-devices/application-information/guidance-documents/software-medical-device-guidance/examples.html
- BLG, Health Canada MLMD framework (2025): https://www.blg.com/fr/insights/2025/02/health-canadas-evolving-regulatory-framework-for-machine-learning-enabled-medical-devices
- OPC news release, vendor guidance (Sept 10, 2026): https://www.priv.gc.ca/en/opc-news/news-and-announcements/2026/nr-c_260910/
- IAPP, OPC draft vendor guidance: https://iapp.org/news/a/notes-from-the-iapp-canada-opc-draft-guidance-moves-vendor-privacy-due-diligence-upstream
- casrai, ISO/IEC 42005 explainer: https://casrai.org/guides/iso-42005-ai-system-impact-assessment
- Claude docs, data residency: https://platform.claude.com/docs/en/manage-claude/data-residency
- Courthouse Libraries BC, SBC 2025 c. 31 (Bill 28) proclamation: https://www.courthouselibrary.ca/how-we-can-help/legislation-case-law/bc-proclamations/business-practices-and-consumer-protection-2
- OIPC BC, breach notification page (call for PIPA reform): https://www.oipc.bc.ca/resources/breach-notification-representatives-of-organizations-and-public-bodies/
- Fulcrum Law, BC breach obligations (Oct 2026): https://www.fulcrumlaw.ca/blog-post/data-breach-obligations-in-bc-what-to-do-when-it-happens
- Archived DADM with Appendix C: https://www.tbs-sct.canada.ca/pol/doc-eng.aspx?id=32745
- Autana, DADM after the 2025 amendment: https://autana.ca/blog/automated-decision-making-in-canada-the-rules-that-matter/
- Justice Canada, Charter Statement Bill C-36: https://canada.justice.gc.ca/eng/csj-sjc/pl/charter-charte/c36_1.html
- Health Canada, SaMD definition and classification: https://www.canada.ca/en/health-canada/services/drugs-health-products/medical-devices/application-information/guidance-documents/software-medical-device-guidance-document.html
- Dentons, BCFSA 2025/26 roadmap (Insurer Code): https://www.mondaq.com/canada/financial-services/1608962/british-columbia-financial-services-authority-releases-20252026-regulatory-roadmap
- Insurance Business, OSFI gen/agentic AI bulletin (July 2026): https://www.insurancebusinessmag.com/ca/news/legal-insights/osfi-maps-out-ai-risk-controls-for-federally-regulated-insurers-582166.aspx
- Chambre de l'assurance, AMF AI guideline: https://chad.ca/en/?p=37916
- Torys, AI and insurance (Moffatt v. Air Canada): https://www.torys.com/en/our-latest-thinking/resources/forging-your-ai-path/ai-and-insurance
- Level Access, Canadian accessibility laws: https://www.levelaccess.com/blog/canadian-accessibility-laws
- Deque, Accessible Canada Act deadlines: https://www.deque.com/blog/the-accessible-canada-act-deadlines-are-closer-than-you-think
