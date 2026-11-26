/**
 * Share links (SPEC §4, ADR-0008, ADR-0020): `/case/<id>#v1.<payload>` where the payload is
 * base64url(deflate-raw(JSON)). It carries the structured intake (never `processDescription`),
 * the confirmed decomposition and the as-of date. Narratives stay out (ADR-0020).
 *
 * Uses the platform `CompressionStream`, so there is no extra dependency. Decoding validates with
 * Zod and rejects oversized or tampered links.
 */
import { z } from "zod";
import { IntakeStructuredSchema } from "@/engine/structured-intake";
import { ConfirmedDecompositionSchema } from "@/engine/types";

export const SHARE_PREFIX = "v1.";
/** Hash payloads above this size are rejected before decompression. */
export const MAX_SHARE_HASH_CHARS = 8000;
/** Guards against a decompression bomb. */
const MAX_JSON_BYTES = 64_000;

export const SharePayloadSchema = z
  .object({
    asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    // Strict: a payload that still carries `processDescription` (or anything else) is rejected.
    intake: IntakeStructuredSchema.strict(),
    decomposition: ConfirmedDecompositionSchema.strict(),
  })
  .strict();
export type SharePayload = z.infer<typeof SharePayloadSchema>;
export type SharePayloadInput = z.input<typeof SharePayloadSchema>;

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream, limit = Infinity): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  void writer.write(bytes as Uint8Array<ArrayBuffer>).then(() => writer.close()).catch(() => undefined);
  const reader = stream.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel();
      throw new Error("too_large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/** Encodes the share payload (the hash without `#`). Validates first, so free text cannot slip in. */
export async function encodeShare(payload: SharePayloadInput): Promise<string> {
  const parsed = SharePayloadSchema.parse(payload);
  const json = new TextEncoder().encode(JSON.stringify(parsed));
  const deflated = await pipe(json, new CompressionStream("deflate-raw"));
  return SHARE_PREFIX + toBase64Url(deflated);
}

export type DecodeResult = { ok: true; payload: SharePayload } | { ok: false; reason: "format" | "too_large" | "invalid" };

/** Decodes a hash (with or without the leading `#`). Never throws. */
export async function decodeShare(hash: string): Promise<DecodeResult> {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  if (!raw.startsWith(SHARE_PREFIX)) return { ok: false, reason: "format" };
  if (raw.length > MAX_SHARE_HASH_CHARS) return { ok: false, reason: "too_large" };
  const body = raw.slice(SHARE_PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/.test(body)) return { ok: false, reason: "format" };
  let text: string;
  try {
    const inflated = await pipe(fromBase64Url(body), new DecompressionStream("deflate-raw"), MAX_JSON_BYTES);
    text = new TextDecoder("utf-8", { fatal: true }).decode(inflated);
  } catch (e) {
    return { ok: false, reason: e instanceof Error && e.message === "too_large" ? "too_large" : "format" };
  }
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, reason: "format" };
  }
  const parsed = SharePayloadSchema.safeParse(json);
  return parsed.success ? { ok: true, payload: parsed.data } : { ok: false, reason: "invalid" };
}

export const SHARE_ERROR_MESSAGES: Record<Exclude<DecodeResult, { ok: true }>["reason"], string> = {
  format: "This share link is incomplete or damaged. Ask for the link again, or start your own case.",
  too_large: "This share link is too long to open. Ask for the link again, or start your own case.",
  invalid: "This share link was made with different fields than this version of Splitline reads. Start your own case instead.",
};
