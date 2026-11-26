/**
 * PLAN Phase 5 acceptance: with LIVE_MODE_ENABLED=false (set in playwright.config) every page still
 * works and the live API answers with its graceful fallback instead of calling the model.
 */
import { expect, test } from "@playwright/test";
import { PRESETS } from "@/content/presets";
import { toStructured } from "@/engine/structured-intake";

const preset = PRESETS.find((p) => p.slug === "claims-document-intake")!;
const ROUTES = ["/", "/sources", "/self-assessment", "/about", "/case/new", "/lab", "/pulse", ...PRESETS.map((p) => `/preset/${p.slug}`)];

test("every page renders with live mode off", async ({ request }) => {
  test.setTimeout(120_000);
  for (const route of ROUTES) expect((await request.get(route)).status(), route).toBe(200);
});

test("live status reports live mode off", async ({ request }) => {
  const res = await request.get("/api/live-status");
  expect(res.status()).toBe(200);
  expect(await res.json()).toMatchObject({ live: false, code: "live_disabled" });
});

test("decompose refuses with the manual-entry fallback", async ({ request }) => {
  const res = await request.post("/api/decompose", { data: { intake: preset.intake } });
  expect(res.status()).toBe(503);
  expect(await res.json()).toMatchObject({ ok: false, code: "live_disabled", fallback: "manual", message: expect.stringContaining("Live mode is off") });
});

test("decompose rejects an invalid payload", async ({ request }) => {
  const res = await request.post("/api/decompose", { data: { intake: { title: "x" } } });
  expect(res.status()).toBe(400);
});

test("narrate answers with the template narrative", async ({ request }) => {
  const res = await request.post("/api/narrate", { data: { intake: toStructured(preset.intake), decomposition: preset.decomposition } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body).toMatchObject({ ok: true, source: "template", notice: { code: "live_disabled" } });
  expect(body.narrative.executiveSummary).toContain("AIA-inspired indicative tier");
  expect(body.narrative.leverNarratives).toHaveLength(3);
});
