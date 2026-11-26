import { describe, expect, it } from "vitest";
import { issueCaseToken, verifyCaseToken } from "./case-token";

const SECRET = "test-secret-test-secret-test-secret-123";

describe("case token (ADR-0008)", () => {
  it("round-trips within its lifetime", async () => {
    const t = await issueCaseToken(SECRET, 1_000, 60);
    expect(await verifyCaseToken(t.token, SECRET, 1_030)).toEqual({ ok: true, jti: t.jti, exp: 1_060 });
  });

  it("rejects expired, tampered, wrongly signed and malformed tokens", async () => {
    const t = await issueCaseToken(SECRET, 1_000, 60);
    expect(await verifyCaseToken(t.token, SECRET, 1_060)).toEqual({ ok: false, reason: "expired" });
    const [body, sig] = t.token.split(".") as [string, string];
    const forged = Buffer.from(JSON.stringify({ jti: "x", exp: 9_999_999 })).toString("base64url");
    expect(await verifyCaseToken(`${forged}.${sig}`, SECRET, 1_000)).toEqual({ ok: false, reason: "signature" });
    expect(await verifyCaseToken(`${body}.${sig}`, `${SECRET}-other`, 1_000)).toEqual({ ok: false, reason: "signature" });
    expect(await verifyCaseToken("nonsense", SECRET, 1_000)).toEqual({ ok: false, reason: "malformed" });
  });

  it("carries no case data", async () => {
    const t = await issueCaseToken(SECRET, 1_000);
    const payload = JSON.parse(Buffer.from(t.token.split(".")[0]!, "base64url").toString("utf8"));
    expect(Object.keys(payload).sort()).toEqual(["exp", "jti"]);
  });
});
