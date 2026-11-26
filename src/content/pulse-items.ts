/**
 * Reinforcement Pulse items (SPEC §7.7, ADR-0009). Verbatim from the thesis, Table 5 ("An
 * illustrative questionnaire for placing a unit in Figure 2"), with a paraphrased variant behind one
 * switch. Verbatim use rests on the supervisor's verbal OK; written confirmation is required before
 * the M3 launch, otherwise set `PULSE_ITEM_MODE` to "paraphrased".
 */
import type { PulseItemId } from "@/components/pulse/pulse-logic";

export type PulseItemMode = "verbatim" | "paraphrased";
export const PULSE_ITEM_MODE: PulseItemMode = "verbatim";

export const PULSE_CITATION_VERBATIM =
  "Items from Table 5 of Julius Wölki, “Holding the Paradox: How Organizational Design Shapes the Automation-Augmentation Reinforcement in Established Firms”, M.Sc. thesis, University of Passau (unpublished). Used with the supervisor's permission.";
export const PULSE_CITATION_PARAPHRASED = "Based on the author's M.Sc. research (unpublished).";

export interface ScaleAnchors {
  low: string;
  mid: string;
  high: string;
}

export interface PulseItemContent {
  id: PulseItemId;
  verbatim: string;
  paraphrased: string;
  anchors: ScaleAnchors;
}

const AGREE: ScaleAnchors = { low: "strongly disagree", mid: "neither agree nor disagree", high: "strongly agree" };
const WORSE_BETTER: ScaleAnchors = { low: "become much worse", mid: "unchanged", high: "become much better" };

/** Group stems, Table 5. The A and B items complete their stem; the D items are statements. */
export const PULSE_STEMS = {
  a: {
    verbatim: "Because of the work the AI system automates, …",
    paraphrased: "Thanks to what the AI system now does automatically, …",
  },
  b: {
    verbatim: "Because of the corrections and expertise of the people who work with the AI system, …",
    paraphrased: "Thanks to the fixes and know-how of the people working with the AI system, …",
  },
  d: { verbatim: "", paraphrased: "" },
} as const;

export const PULSE_ITEM_CONTENT: readonly PulseItemContent[] = [
  {
    id: "A1",
    verbatim: "… the time our team spends on work that requires judgment has",
    paraphrased: "… the time we spend on work that needs judgment has",
    anchors: { low: "decreased strongly", mid: "unchanged", high: "increased strongly" },
  },
  {
    id: "A2",
    verbatim: "… the information we have for handling difficult or unusual cases has",
    paraphrased: "… what we know when a hard or unusual case comes in has",
    anchors: WORSE_BETTER,
  },
  {
    id: "A3",
    verbatim: "… our own expertise in handling such cases has",
    paraphrased: "… our own skill at handling those cases has",
    anchors: { low: "declined strongly", mid: "unchanged", high: "grown strongly" },
  },
  {
    id: "B1",
    verbatim: "… the quality of the system’s automated output has",
    paraphrased: "… the quality of what the system produces on its own has",
    anchors: WORSE_BETTER,
  },
  {
    id: "B2",
    verbatim: "… the range of tasks the system can take over has",
    paraphrased: "… the number of tasks the system can handle has",
    anchors: { low: "shrunk strongly", mid: "unchanged", high: "grown strongly" },
  },
  {
    id: "B3",
    verbatim: "… the reliability of the data the system learns from has",
    paraphrased: "… how trustworthy the system's learning data is has",
    anchors: WORSE_BETTER,
  },
  {
    id: "D1",
    verbatim: "Our team decides which subtasks the AI system takes over.",
    paraphrased: "We, the team doing the work, choose which steps the AI handles.",
    anchors: AGREE,
  },
  {
    id: "D2",
    verbatim: "We regularly review and change which tasks the AI system takes over.",
    paraphrased: "We check and adjust, on a regular basis, what the AI handles.",
    anchors: AGREE,
  },
  {
    id: "D3",
    verbatim: "The AI team and our unit regularly discuss the system’s failures and edge cases.",
    paraphrased: "The AI team and our team talk regularly about where the system fails and its unusual cases.",
    anchors: AGREE,
  },
];

export function pulseItems(mode: PulseItemMode = PULSE_ITEM_MODE) {
  return {
    citation: mode === "verbatim" ? PULSE_CITATION_VERBATIM : PULSE_CITATION_PARAPHRASED,
    stems: { a: PULSE_STEMS.a[mode], b: PULSE_STEMS.b[mode] },
    items: PULSE_ITEM_CONTENT.map((i) => ({ id: i.id, text: mode === "verbatim" ? i.verbatim : i.paraphrased, anchors: i.anchors })),
  };
}
