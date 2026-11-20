/** International standards. Status per docs/research/01_* §2.10. */
import type { RuleDefinition } from "@/engine/types";
import { LAST_VERIFIED, SRC } from "./sources";

export const INTL_RULES: RuleDefinition[] = [
  {
    id: "ISO-42001",
    title: "AI inventory record and impact-assessment summary",
    jurisdiction: "intl",
    instrument: "ISO/IEC 42001 (cl. 6.1.4, 8.4) and ISO/IEC 42005:2025",
    status: "VOLUNTARY",
    reads: ["aiType"],
    appliesWhen: () => true,
    severity: () => "info",
    consideration:
      "ISO/IEC 42001 expects an AI system impact assessment process with retained results, and ISO/IEC 42005 describes what such an assessment covers. Splitline's export provides an inventory record and a 42005-style summary.",
    actionsToConsider: [
      "Record the use case in your AI inventory.",
      "Keep an impact-assessment summary and repeat it at deployment and at any significant change.",
    ],
    sources: [SRC.iso42005],
    lastVerified: LAST_VERIFIED,
  },
];
