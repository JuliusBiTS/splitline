import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "./version";

describe("ENGINE_VERSION", () => {
  it("is a semver string", () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
