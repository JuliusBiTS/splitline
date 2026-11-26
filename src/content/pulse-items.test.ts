import { describe, expect, it } from "vitest";
import { PULSE_ITEM_IDS } from "@/components/pulse/pulse-logic";
import { PULSE_CITATION_PARAPHRASED, PULSE_ITEM_CONTENT, pulseItems } from "./pulse-items";

describe("Pulse items (SPEC §7.7, ADR-0009)", () => {
  it("has all nine items in both modes, with anchors", () => {
    expect(PULSE_ITEM_CONTENT.map((i) => i.id)).toEqual([...PULSE_ITEM_IDS]);
    for (const i of PULSE_ITEM_CONTENT) {
      expect(i.verbatim.length).toBeGreaterThan(10);
      expect(i.paraphrased.length).toBeGreaterThan(10);
      expect(i.paraphrased).not.toBe(i.verbatim);
      expect(i.anchors.low && i.anchors.mid && i.anchors.high).toBeTruthy();
    }
  });

  it("switches wording and citation together", () => {
    const v = pulseItems("verbatim");
    const p = pulseItems("paraphrased");
    expect(v.citation).toContain("Table 5");
    expect(p.citation).toBe(PULSE_CITATION_PARAPHRASED);
    expect(p.citation).toContain("based on the author's M.Sc. research (unpublished)".replace(/^b/, "B"));
    expect(v.items.map((i) => i.text)).not.toEqual(p.items.map((i) => i.text));
  });

  it("keeps the Table 5 wording verbatim for the scored items", () => {
    const v = pulseItems("verbatim");
    expect(v.stems.a).toBe("Because of the work the AI system automates, …");
    expect(v.items.find((i) => i.id === "D2")?.text).toBe("We regularly review and change which tasks the AI system takes over.");
  });
});
