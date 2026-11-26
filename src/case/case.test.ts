import { describe, expect, it } from "vitest";
import { PRESETS } from "@/content/presets";
import { toStructured } from "@/engine/structured-intake";
import { CaseRecordSchema, descriptionOf, newCaseId, structuredIntakeOf } from "./case";
import { decodeShare, encodeShare, MAX_SHARE_HASH_CHARS, SHARE_PREFIX } from "./share";
import { deleteCase, listCaseIds, loadCase, saveCase, type StorageLike } from "./storage";

function memoryStore(): StorageLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

const preset = PRESETS[0]!;
const payloadFor = (p = preset) => ({ asOf: "2026-11-26", intake: toStructured(p.intake), decomposition: p.decomposition });

describe("share link (ADR-0008, ADR-0020)", () => {
  it("round-trips the structured intake and confirmed decomposition for every preset", async () => {
    for (const p of PRESETS) {
      const hash = await encodeShare(payloadFor(p));
      expect(hash.startsWith(SHARE_PREFIX)).toBe(true);
      const decoded = await decodeShare(`#${hash}`);
      expect(decoded.ok).toBe(true);
      if (!decoded.ok) continue;
      expect(decoded.payload.decomposition).toEqual(p.decomposition);
      expect(decoded.payload.intake.title).toBe(p.intake.title);
      expect(decoded.payload.asOf).toBe("2026-11-26");
    }
  });

  it("never carries the free-text description", async () => {
    const hash = await encodeShare(payloadFor());
    const decoded = await decodeShare(hash);
    expect(decoded.ok && "processDescription" in decoded.payload.intake).toBe(false);
    // The encoder rejects a payload that still has the description instead of passing it on.
    await expect(encodeShare({ ...payloadFor(), intake: preset.intake } as never)).rejects.toThrow();
  });

  it("stays well under the length limit for all presets", async () => {
    for (const p of PRESETS) {
      const hash = await encodeShare(payloadFor(p));
      expect(hash.length).toBeLessThan(MAX_SHARE_HASH_CHARS / 2);
    }
  });

  it("rejects damaged, oversized and wrong-shape links without throwing", async () => {
    expect(await decodeShare("#nope")).toEqual({ ok: false, reason: "format" });
    expect(await decodeShare(`#${SHARE_PREFIX}!!!`)).toEqual({ ok: false, reason: "format" });
    expect(await decodeShare(`#${SHARE_PREFIX}${"A".repeat(MAX_SHARE_HASH_CHARS)}`)).toEqual({ ok: false, reason: "too_large" });
    const hash = await encodeShare(payloadFor());
    const tampered = hash.slice(0, -6) + "AAAAAA";
    expect((await decodeShare(tampered)).ok).toBe(false);

    // Valid compression, wrong shape (extra key).
    const wrong = new TextEncoder().encode(JSON.stringify({ ...payloadFor(), extra: 1 }));
    const cs = new CompressionStream("deflate-raw");
    const out = new Uint8Array(await new Response(new Blob([wrong]).stream().pipeThrough(cs)).arrayBuffer());
    const b64 = btoa(String.fromCharCode(...out)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect(await decodeShare(SHARE_PREFIX + b64)).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("case record and storage", () => {
  const record = {
    v: 1 as const,
    id: "abc23def45",
    asOf: "2026-11-26",
    intake: preset.intake,
    fromShareLink: false,
    proposed: null,
    decomposition: preset.decomposition,
    entry: "manual" as const,
  };

  it("makes short URL-safe IDs", () => {
    const id = newCaseId();
    expect(id).toMatch(/^[a-z0-9]{10}$/);
    expect(newCaseId(() => new Uint8Array(10))).toBe("aaaaaaaaaa");
  });

  it("keeps the description locally and strips it for the structured view", () => {
    const parsed = CaseRecordSchema.parse(record);
    expect(descriptionOf(parsed)).toBe(preset.intake.processDescription);
    expect("processDescription" in structuredIntakeOf(parsed)).toBe(false);
    const shared = CaseRecordSchema.parse({ ...record, intake: toStructured(preset.intake), fromShareLink: true, entry: "shared" });
    expect(descriptionOf(shared)).toBeNull();
  });

  it("saves, lists, loads and deletes", () => {
    const store = memoryStore();
    expect(saveCase(record, store)).toBe(true);
    expect(listCaseIds(store)).toEqual(["abc23def45"]);
    expect(loadCase("abc23def45", store)?.decomposition).toEqual(preset.decomposition);
    deleteCase("abc23def45", store);
    expect(loadCase("abc23def45", store)).toBeNull();
    expect(listCaseIds(store)).toEqual([]);
  });

  it("survives broken or blocked storage", () => {
    const store = memoryStore();
    store.data.set("splitline:case:abc23def45", "{not json");
    expect(loadCase("abc23def45", store)).toBeNull();
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => undefined,
    };
    expect(saveCase(record, throwing)).toBe(false);
    expect(loadCase("abc23def45", throwing)).toBeNull();
    expect(loadCase("abc23def45", null)).toBeNull();
  });
});
