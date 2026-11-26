import { describe, expect, it } from "vitest";
import { attributeAgreement, countStable, isComplete, jaccard, meanAgreement, words } from "./eval-llm.lib";

const st = (name: string, over: Record<string, unknown> = {}) => ({
  name,
  description: "d",
  rationale: "r",
  judgmentIntensity: "low" as const,
  knowledgeType: "codifiable" as const,
  errorCost: "low" as const,
  volume: "high" as const,
  affectsIndividuals: true,
  consequential: false,
  ...over,
});

describe("eval metrics", () => {
  it("count stability allows ±1", () => {
    expect(countStable([5, 6, 5])).toBe(true);
    expect(countStable([4, 6, 5])).toBe(false);
  });

  it("matches names by word overlap, ignoring stop words and plurals", () => {
    expect(jaccard(words("Extract receipt fields"), words("Extracting the receipt field"))).toBe(1);
    expect(jaccard(words("Classify documents"), words("Recommend eligibility"))).toBe(0);
  });

  it("scores identical decompositions 1 and fully mismatched ones 0", () => {
    const a = [st("Classify documents"), st("Extract receipt fields")];
    expect(attributeAgreement(a, a)).toBe(1);
    expect(attributeAgreement(a, [st("Unrelated step"), st("Another thing")])).toBe(0);
  });

  it("counts attribute disagreements and unmatched steps", () => {
    const a = [st("Classify documents"), st("Extract receipt fields")];
    const b = [st("Classify documents", { errorCost: "high", volume: "low", consequential: true }), st("Extract receipt fields"), st("Decide")];
    expect(attributeAgreement(a, b)).toBeCloseTo((0.5 + 1) / 3);
    expect(meanAgreement([a, a, a])).toBe(1);
  });

  it("completeness needs non-empty text and a grounded quote per subtask", () => {
    expect(isComplete([st("a")], 1)).toBe(true);
    expect(isComplete([st("a")], 0)).toBe(false);
    expect(isComplete([st("a", { rationale: " " })], 1)).toBe(false);
  });
});
