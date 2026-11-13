import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createPortfolio, saved, signIn, uid } from "./helpers";

async function audit(page: Page, name: string) {
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(
    serious.map((v) => `${name} — ${v.id}: ${v.nodes.length} × ${v.nodes[0]?.target.join(" ")} — ${v.nodes[0]?.failureSummary?.split("\n")[1] ?? ""}`),
  ).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`${scheme} mode`, () => {
    test.use({ colorScheme: scheme });

    test("public pages have no serious accessibility violations", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: scheme });
      for (const path of ["/", "/templates", "/login", "/privacy", "/terms", "/this-page-does-not-exist"]) {
        await page.goto(path);
        await expect(page.locator("h1")).toHaveCount(1);
        await audit(page, path);
      }
      // FAQ answers the headline question.
      await page.goto("/");
      await page.getByText("Is it really free?").click();
      await expect(page.getByText(/no paid tier, no ads/)).toBeVisible();
    });

    test("app pages (onboarding, editor, dashboard, deploy) have no serious accessibility violations", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce", colorScheme: scheme });
      const id = uid();
      await signIn(page, `a11y-${id}@example.com`, "/new");
      await expect(page.getByRole("heading", { level: 1, name: "Choose a template" })).toBeVisible();
      await audit(page, "/new step 1");
      const pid = await createPortfolio(page, { template: "Bento", start: "Designer", name: "Axe Tester", slug: `a11y-${id}` });
      await expect(page.frameLocator('iframe[title="Live preview of your portfolio"]').locator("h1")).toBeVisible();

      // Editor: section open, field builder open, each tab.
      await page.getByRole("button", { name: /^Case studies Projects/ }).click();
      await page.getByRole("button", { name: "Edit fields" }).click();
      await audit(page, "editor content");
      await page.getByRole("tab", { name: "Theme" }).click();
      await audit(page, "editor theme");
      await page.getByRole("tab", { name: "Profile" }).click();
      await audit(page, "editor profile");
      await page.getByRole("tab", { name: "Accounts" }).click();
      await page.getByLabel("Mock Judge handle").fill("axe-tester");
      await page.getByRole("button", { name: "Connect", exact: true }).click();
      await expect(page.getByTestId("verify-code")).toBeVisible();
      await audit(page, "editor accounts");
      await saved(page);

      await page.goto("/dashboard");
      await audit(page, "/dashboard");
      await page.goto(`/deploy/${pid}`);
      await expect(page.getByRole("heading", { name: "Publish your content" })).toBeVisible();
      await audit(page, "/deploy");
    });
  });
}

test("editor: validation errors are shown inline and block saving until fixed", async ({ page }) => {
  const id = uid();
  await signIn(page, `val-${id}@example.com`, "/new");
  await createPortfolio(page, { template: "Swiss", start: "Blank", name: "Val Tester", slug: `val-${id}` });
  await page.getByRole("button", { name: /^Get in touch Contact/ }).click();
  await page.getByLabel("Email", { exact: true }).fill("not-an-email");
  await expect(page.getByText("Invalid email")).toBeVisible();
  await expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "invalid");
  await page.getByLabel("Email", { exact: true }).fill("val@example.com");
  await saved(page);
  // The completeness meter reacts to content.
  await expect(page.getByRole("progressbar", { name: "Completeness" })).toHaveAttribute("aria-valuenow", /^\d+$/);
});

test("admin dashboard: KPIs, funnel, charts and audit log for admins only", async ({ page, request }) => {
  const id = uid();
  // Generate some activity as a normal user (with a deployment confirmation).
  await signIn(page, `maker-${id}@example.com`, "/new");
  const pid = await createPortfolio(page, { template: "Aurora", start: "Solutions engineer", name: "Stats Maker", slug: `stats-${id}` });
  await page.getByTestId("publish").click();
  await expect(page.getByTestId("publish")).toHaveText("Published");
  expect((await request.post("/api/public/deployments", { data: { portfolioId: pid, vercelUrl: `stats-${id}.vercel.app`, templateId: "aurora", runtimeVersion: "1.0.0" } })).status()).toBe(202);
  await page.request.post("/api/auth/signout", { headers: { "x-persona-csrf": "1", origin: "http://localhost:3100" } });

  await signIn(page, "admin@example.com", "/admin");
  await expect(page.getByRole("heading", { level: 1, name: "Admin" })).toBeVisible();
  await expect(page.getByTestId("kpi-created")).not.toHaveText("0");
  await expect(page.getByTestId("kpi-deployConfirmed")).not.toHaveText("0");
  await expect(page.getByRole("heading", { name: "Funnel" })).toBeVisible();
  await expect(page.getByRole("img", { name: /Line chart of unique visitors/ })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(`stats-${id}.vercel.app`) })).toBeVisible();

  // Date range picker.
  await page.getByText("24 hours").click();
  await expect(page.getByTestId("kpi-created")).not.toHaveText("0");

  // Audit log: filter by action, expand a diff, CSV export.
  await page.getByLabel("Action").selectOption("portfolio.publish");
  await page.getByRole("button", { name: "Apply" }).click();
  const rows = page.getByRole("table", { name: /Audit log/ }).locator("tbody tr");
  await expect(rows.first()).toContainText("portfolio.publish");
  await rows.first().getByRole("button", { name: "Diff" }).click();
  await expect(page.getByRole("table", { name: "Before and after" })).toContainText("publishedAt");
  const csv = await page.request.get("/api/admin/audit?format=csv&action=portfolio.publish");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("id,ts,actorUserId,action");
  // Admin actions are themselves audited.
  const log = await (await page.request.get("/api/admin/audit?action=admin.export_audit")).json();
  expect(log.rows.length).toBeGreaterThan(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await audit(page, "/admin");
});
