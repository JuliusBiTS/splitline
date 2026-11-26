import { expect, test } from "@playwright/test";
import { PRESET_SLUGS } from "../../src/content/presets/slugs";

/** Pages in a PDF buffer: one `/Type /Page` object per page (not `/Pages`). */
function pageCount(pdf: Buffer): number {
  return (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) ?? []).length;
}

test.describe("charter print view (SPEC §11)", () => {
  for (const slug of PRESET_SLUGS) {
    test(`fits on one page, Letter and A4: ${slug}`, async ({ page }) => {
      await page.goto(`/preset/${slug}/charter`);
      await expect(page.getByRole("article")).toContainText("Indicative triage only, not legal advice.");
      await page.emulateMedia({ media: "print" });
      // Headroom: at the Letter printable width (8.5 in minus @page margins) the charter must use at
      // most 90% of the printable height, so font differences across platforms cannot add a page.
      await page.setViewportSize({ width: 816 - 68, height: 1000 });
      const height = await page.getByRole("article").evaluate((el) => el.getBoundingClientRect().height);
      expect(height / (1056 - 60), `${slug} fill`).toBeLessThanOrEqual(0.9);
      for (const format of ["Letter", "A4"] as const) {
        const pdf = await page.pdf({ format, printBackground: true, preferCSSPageSize: false });
        expect(pdf.length).toBeGreaterThan(1000);
        expect(pageCount(pdf), `${slug} ${format}`).toBe(1);
      }
    });
  }
});

test("an unknown preset charter is a real 404", async ({ request }) => {
  expect((await request.get("/preset/no-such-preset/charter")).status()).toBe(404);
  expect((await request.get("/preset/clinical-referral-triage/charter")).status()).toBe(200);
});
