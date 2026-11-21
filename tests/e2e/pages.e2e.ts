import { expect, test } from "@playwright/test";
import { RULE_CATALOGUE } from "@/content/rules";

const NAV = ["Presets", "Start your own", "Living Lab", "Pulse", "Governance Map"];

test("main navigation and footer links resolve", async ({ page, request }) => {
  test.setTimeout(90_000); // fetches every linked route; first compiles are slow on the dev server
  await page.goto("/");
  const main = page.getByRole("navigation", { name: "Main" });
  for (const label of NAV) await expect(main.getByRole("link", { name: label, exact: true })).toBeVisible();
  await expect(main.getByRole("link", { name: "Presets" })).toHaveAttribute("aria-current", "page");
  const footer = page.getByRole("navigation", { name: "Footer" });
  const hrefs = [
    ...(await main.getByRole("link").evaluateAll((els) => els.map((e) => e.getAttribute("href")))),
    ...(await footer.getByRole("link").evaluateAll((els) => els.map((e) => e.getAttribute("href")))),
  ];
  expect(hrefs).toEqual(expect.arrayContaining(["/sources", "/self-assessment", "/about", "/case/new", "/lab", "/pulse"]));
  for (const href of hrefs) expect((await request.get(href!)).status(), href!).toBe(200);
  await expect(page.getByText("Indicative triage, not legal advice.")).toBeVisible();
  await expect(page.getByText("Built by Julius Wölki.")).toBeVisible();
});

test("mobile menu opens and lists the main navigation", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open menu" }).click();
  const menu = page.locator("#mobile-nav");
  for (const label of NAV) await expect(menu.getByRole("link", { name: label, exact: true })).toBeVisible();
});

test("/sources lists every catalogue rule with status and verification date", async ({ page }) => {
  await page.goto("/sources");
  await expect(page.getByRole("heading", { level: 1, name: "Governance Map" })).toBeVisible();
  for (const r of RULE_CATALOGUE) {
    const item = page.locator(`li[id="${r.id}"]`);
    await expect(item.getByRole("heading", { name: r.title })).toBeVisible();
    await expect(item.getByText(/^Verified /)).toBeVisible();
  }
  for (const r of RULE_CATALOGUE.filter((x) => x.status === "PROPOSED")) {
    await expect(page.locator(`li[id="${r.id}"]`).getByText("Prepare for (proposed)")).toBeVisible();
  }
});

test("/self-assessment runs Splitline through its engine and states the inference location", async ({ page }) => {
  await page.goto("/self-assessment");
  await expect(page.getByText(/Claude API inference runs in the US or globally\. There is no Canadian inference location/)).toBeVisible();
  await expect(page.getByText(/AIA-inspired indicative tier I$/).first()).toBeVisible();
  await expect(page.getByText("Indicative triage only, not legal advice. Confirm with your privacy office or counsel.").first()).toBeVisible();
});

test("/about has the thesis, the scope disclosure and the author card", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "The thesis in brief" })).toBeVisible();
  await expect(page.getByText(/The thesis propositions are untested\. The thesis model is firm-level/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "About the author" })).toBeVisible();
});

test("no author card on /", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "About the author" })).toHaveCount(0);
});

for (const route of ["/", "/preset/hiring-and-sentiment", "/sources"]) {
  test(`interactive targets on ${route} are at least 24 × 24 px`, async ({ page }) => {
    await page.goto(route);
    const small = await page.$$eval("header a, header button, main button, main [role=switch], main a, main [role=tab], footer a", (els) =>
      els
        // Visually hidden until focused (skip link) and hidden elements are not targets yet.
        .filter((e) => (e as HTMLElement).offsetParent !== null && !e.classList.contains("sr-only"))
        .map((e) => ({ name: e.textContent?.trim() || e.getAttribute("aria-label"), r: e.getBoundingClientRect() }))
        .filter(({ r }) => r.width < 24 || r.height < 24)
        .map(({ name, r }) => `${name}: ${Math.round(r.width)}×${Math.round(r.height)}`),
    );
    expect(small).toEqual([]);
  });
}
