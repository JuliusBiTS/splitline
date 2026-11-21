import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** Routes to scan. Extend as routes land (Phase 4: /preset/*, /sources; Phase 8: all). */
const ROUTES = ["/", "/dev/components"];

for (const route of ROUTES) {
  test(`no serious or critical axe violations on ${route}`, async ({ page }) => {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === "serious" || v.impact === "critical",
    );
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
  });
}
