import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const RUNTIME = "http://localhost:3200";
const TEMPLATES = ["signal", "editorial", "bento", "aurora", "brutal", "cinematic", "swiss", "os", "paper", "casefile", "card", "quiet", "kinetic", "archive"];

// Mirrors apps/runtime/src/schema/seeds/fixture.ts
const EXPECTED_TITLES = ["About", "By the numbers", "Selected work", "Experience", "Skills", "Education", "Kind words", "Certifications", "Talks", "Writing", "Recognition", "Volunteering", "Field lab", "Patents", "Get in touch"];
const FORBIDDEN = ["Hidden section", "Should never render", "Empty section"];
// One value from every FieldType in the user-invented "Field lab" section.
const LAB_VALUES = ["Everything at once", "Experiment", "Plain notes with a line break.", "Rich", "example.com", "lab@example.com", "+1 555 010 2030", "1,234,567", "quality score", "Jun 1, 2024", "Jan 2023 — Jun 2024", "alpha", "Open the lab", "Paper", "Watch on example.com", "export const answer", "Bluebird", "Station Nine", "EP 4 012 345"];

for (const template of TEMPLATES) {
  for (const mode of ["light", "dark"] as const) {
    test(`${template} (${mode}) renders every section kind, accessibly`, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`${RUNTIME}/preview/${template}/${mode}`);
      await expect(page.locator("[data-template]")).toHaveAttribute("data-template", template);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toHaveText("Maya Okafor");
      await expect(page.getByRole("link", { name: "Skip to content" })).toBeAttached();

      // Bento keeps heavy fields (code, galleries, long text) in a tile's expanded detail view.
      if (template === "bento") await page.getByRole("button", { name: "Open details: Everything at once" }).click();

      // Every preset kind + the custom and unknown-kind sections are rendered as headed sections…
      const html = await page.content();
      for (const title of EXPECTED_TITLES) {
        await expect(page.locator(`section[aria-labelledby] h2, section[aria-labelledby] .os-title`).filter({ hasText: new RegExp(`^${title}$`) }), `section "${title}"`).toHaveCount(1);
      }
      // …with every field type drawn by the generic renderer…
      for (const value of LAB_VALUES) expect(html, `field value "${value}"`).toContain(value);
      expect(await page.locator("pre.pf-code").count()).toBeGreaterThan(0);
      expect(await page.locator(".pf-gallery img").count()).toBe(2);
      // …while hidden and empty sections leave no trace.
      for (const text of FORBIDDEN) expect(html).not.toContain(text);

      // Images have alt text; rich text is sanitized.
      expect(await page.locator("img:not([alt])").count()).toBe(0);
      expect(html).not.toMatch(/<script[^>]*>[^<]*alert/);

      const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")} — ${v.nodes[0]?.failureSummary?.split("\n")[1] ?? ""}`)).toEqual([]);
      expect(errors).toEqual([]);
    });
  }

  test(`${template} has no horizontal overflow from 360px to 2560px`, async ({ page }) => {
    for (const width of [360, 768, 1280, 2560]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`${RUNTIME}/preview/${template}/light`);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${template} @ ${width}px`).toBeLessThanOrEqual(1);
    }
  });
}

test("production routes: fixture preview is the only extra, SEO files exist", async ({ request }) => {
  const home = await request.get(`${RUNTIME}/`);
  expect(home.status()).toBe(200);
  const html = await home.text();
  expect(html).toContain('<script type="application/ld+json">');
  expect(html).toContain('"@type":"Person"');
  expect(html).toMatch(/<meta property="og:image"/);
  expect(html).toMatch(/<link rel="canonical"/);
  expect((await request.get(`${RUNTIME}/sitemap.xml`)).status()).toBe(200);
  expect(await (await request.get(`${RUNTIME}/robots.txt`)).text()).toContain("Sitemap:");
  const og = await request.get(`${RUNTIME}/opengraph-image`);
  expect(og.status()).toBe(200);
  expect(og.headers()["content-type"]).toBe("image/png");
});
