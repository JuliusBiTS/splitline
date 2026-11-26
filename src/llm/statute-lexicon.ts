/**
 * Statute lexicon for the narration guard (SPEC §8). Every catalogue rule lists the short names
 * its instrument goes by; a statute counts as mentioned when any of its names appears. A name
 * shared by several rules (e.g. "PIPA") is allowed when any of those rules triggered.
 *
 * `display` is the short source name the narration facts use for the rule. A test keeps this in
 * sync with the catalogue: a new rule fails `pnpm verify` until it has an entry here.
 */
export interface LexiconEntry {
  /** Short source name shown to the model and used by the template, e.g. "BC FIPPA". */
  display: string;
  /** Names that count as a mention of this instrument. Empty only for REF-AIA-TIER (see its entry). */
  names: readonly string[];
}

export const STATUTE_LEXICON: Readonly<Record<string, LexiconEntry>> = {
  "BC-PIPA-01": { display: "BC PIPA", names: ["PIPA", "Personal Information Protection Act"] },
  "BC-PIPA-EMP": { display: "BC PIPA", names: ["PIPA", "Personal Information Protection Act"] },
  "BC-PIPA-MON": { display: "OIPC BC guidance under BC PIPA", names: ["PIPA", "OIPC", "Information and Privacy Commissioner"] },
  "BC-FIPPA-01": { display: "BC FIPPA", names: ["FIPPA", "Freedom of Information and Protection of Privacy Act"] },
  "BC-FIPPA-XB": { display: "BC FIPPA", names: ["FIPPA", "Freedom of Information and Protection of Privacy Act"] },
  "BC-GOV-GENAI": { display: "BC Public Service generative AI policy", names: ["Public Service generative AI policy"] },
  "BC-HRC-01": { display: "BC Human Rights Code", names: ["Human Rights Code"] },
  "BC-OIPC-SCRIBE": { display: "OIPC BC guidance on AI scribes", names: ["OIPC", "Information and Privacy Commissioner"] },
  "INS-FAIR": { display: "BCFSA Insurer Code of Market Conduct", names: ["BCFSA", "Code of Market Conduct"] },
  "LIAB-CUSTFACING": { display: "Moffatt v. Air Canada", names: ["Moffatt", "Air Canada", "Civil Resolution Tribunal"] },
  "FED-PIPEDA-XB": { display: "PIPEDA", names: ["PIPEDA"] },
  "FED-OPC-VENDOR": {
    display: "OPC draft guidance",
    names: ["OPC", "Office of the Privacy Commissioner", "Privacy Commissioner of Canada"],
  },
  "FED-C36-ADM": { display: "Bill C-36 (proposed)", names: ["C-36", "PPCDA", "Protecting Privacy and Consumer Data Act"] },
  "FED-C36-XB": { display: "Bill C-36 (proposed)", names: ["C-36", "PPCDA", "Protecting Privacy and Consumer Data Act"] },
  "FED-DADM-01": {
    display: "Directive on Automated Decision-Making",
    names: ["Directive on Automated Decision-Making", "DADM", "Treasury Board", "Algorithmic Impact Assessment", "AIA"],
  },
  "FED-DADM-HITL": {
    display: "Directive on Automated Decision-Making",
    names: ["Directive on Automated Decision-Making", "DADM", "Treasury Board"],
  },
  // Always triggers (it explains the tier), so it allows no names: "DADM" and "Algorithmic Impact Assessment"
  // count only when FED-DADM-01 or FED-DADM-HITL triggered. The tier label "AIA-inspired" is exempt in patternFor.
  "REF-AIA-TIER": { display: "Splitline's AIA-inspired indicative tier (reference only)", names: [] },
  "OSFI-E23": { display: "OSFI Guideline E-23", names: ["OSFI", "E-23"] },
  "INS-OSFI-GENAI": { display: "OSFI generative AI bulletin", names: ["OSFI"] },
  "VC-GENAI-MGR": { display: "Voluntary Code on generative AI", names: ["Voluntary Code", "ISED"] },
  "HC-SAMD-01": { display: "Health Canada medical device rules", names: ["Medical Devices Regulations", "SaMD", "Health Canada"] },
  "ISO-42001": { display: "ISO/IEC 42001", names: ["ISO/IEC", "42001", "42005"] },
  "ON-ESA-AI": { display: "Ontario Employment Standards Act", names: ["Employment Standards Act", "Working for Workers"] },
  "QC-L25-121": { display: "Quebec Law 25", names: ["Law 25", "Bill 64"] },
  "QC-AMF-AI": { display: "AMF guideline", names: ["AMF", "Autorité des marchés financiers"] },
};

export interface StatuteName {
  name: string;
  /** Rules whose instrument goes by this name. */
  ruleIds: readonly string[];
  pattern: RegExp;
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Acronyms and codes (no lower-case letters) match case-sensitively; phrases case-insensitively.
 * Matches need a non-alphanumeric boundary on both sides. "AIA" is not matched in the always-allowed
 * tier label "AIA-inspired".
 */
function patternFor(name: string): RegExp {
  const isCode = name === name.toUpperCase();
  const tail = name === "AIA" ? "(?![A-Za-z0-9]|-inspired)" : "(?![A-Za-z0-9])";
  return new RegExp(`(?<![A-Za-z0-9])${escapeRegExp(name)}${tail}`, isCode ? "g" : "gi");
}

export function buildStatuteNames(lexicon: Readonly<Record<string, LexiconEntry>> = STATUTE_LEXICON): StatuteName[] {
  const byName = new Map<string, string[]>();
  for (const [ruleId, entry] of Object.entries(lexicon)) {
    for (const name of entry.names) byName.set(name, [...(byName.get(name) ?? []), ruleId]);
  }
  return [...byName.entries()].map(([name, ruleIds]) => ({ name, ruleIds, pattern: patternFor(name) }));
}

export function displayNameFor(ruleId: string): string {
  return STATUTE_LEXICON[ruleId]?.display ?? ruleId;
}
