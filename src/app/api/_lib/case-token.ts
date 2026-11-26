/**
 * Signed, short-lived case token (ADR-0008, ADR-0019). `/api/decompose` issues one; it pays for
 * one `/api/narrate` call. HMAC-SHA-256 via Web Crypto over `{ jti, exp }`; single use is enforced
 * by the store. The token carries no case data.
 */
export const CASE_TOKEN_TTL_SECONDS = 30 * 60;

interface TokenPayload {
  jti: string;
  exp: number;
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(data))));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function issueCaseToken(
  secret: string,
  nowSeconds: number,
  ttlSeconds: number = CASE_TOKEN_TTL_SECONDS,
): Promise<{ token: string; jti: string; exp: number }> {
  const payload: TokenPayload = { jti: crypto.randomUUID(), exp: nowSeconds + ttlSeconds };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  return { token: `${body}.${await hmac(secret, body)}`, jti: payload.jti, exp: payload.exp };
}

export type VerifyResult = { ok: true; jti: string; exp: number } | { ok: false; reason: "malformed" | "signature" | "expired" };

export async function verifyCaseToken(token: string, secret: string, nowSeconds: number): Promise<VerifyResult> {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };
  const [body, sig] = parts as [string, string];
  if (!timingSafeEqual(sig, await hmac(secret, body))) return { ok: false, reason: "signature" };
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as TokenPayload).jti !== "string" ||
    typeof (payload as TokenPayload).exp !== "number"
  ) {
    return { ok: false, reason: "malformed" };
  }
  const { jti, exp } = payload as TokenPayload;
  if (exp <= nowSeconds) return { ok: false, reason: "expired" };
  return { ok: true, jti, exp };
}
