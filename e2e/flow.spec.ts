import { expect, test } from "@playwright/test";
import { createPortfolio, saved, signIn, uid } from "./helpers";

test("sign up → create → custom section with 3 custom fields → reorder → switch template → publish → deploy", async ({ page, request }) => {
  const id = uid();
  const slug = `e2e-${id}`;

  // Sign up (local mode: any email creates an account).
  await page.goto("/new");
  await expect(page).toHaveURL(/\/login\?next=%2Fnew/);
  await signIn(page, `user-${id}@example.com`, "/new");

  // Create from a template with sample content.
  const portfolioId = await createPortfolio(page, { template: "Swiss", start: "Developer", name: "Ada Tester", slug });
  const preview = page.frameLocator('iframe[title="Live preview of your portfolio"]');
  await expect(preview.getByRole("heading", { level: 1, name: "Ada Tester" })).toBeVisible();
  await expect(preview.locator("[data-template]")).toHaveAttribute("data-template", "swiss");

  // Add a custom section and give its entries three custom fields.
  await page.getByRole("button", { name: "Add section" }).click();
  await page.getByRole("menuitem", { name: /Custom section/ }).click();
  await page.getByLabel("Section title").fill("Inventions");
  await page.getByRole("button", { name: "Edit fields" }).click();
  const shape = page.getByRole("group", { name: "Fields of each entry" });
  for (const [label, type] of [["Patent no.", "text"], ["Filed", "date"], ["Registry", "url"]] as const) {
    await shape.getByLabel("New field name").fill(label);
    await shape.getByLabel("Type").selectOption(type);
    await shape.getByRole("button", { name: "Add field" }).click();
    await expect(shape.getByRole("textbox", { name: /^Field name/ }).last()).toHaveValue(label);
  }
  await expect(shape.getByRole("textbox", { name: /^Field name/ })).toHaveCount(5); // title, description + 3 custom
  await page.getByRole("button", { name: "Done editing fields" }).click();

  await page.getByRole("button", { name: "Add entry" }).click();
  await page.getByRole("textbox", { name: /^Title/ }).fill("Self-folding umbrella");
  await page.getByLabel("Patent no.").fill("EP 1 234 567");
  await page.getByLabel("Filed").fill("2024-05");
  await page.getByLabel("Registry").fill("https://example.com/patents/1234567");
  await saved(page);

  await expect(preview.getByRole("heading", { name: "Inventions" })).toBeVisible();
  await expect(preview.getByText("EP 1 234 567")).toBeVisible();
  await expect(preview.getByText("May 2024")).toBeVisible();

  // Reorder with the keyboard: move the new section up two places.
  const sections = page.getByRole("list", { name: "Sections: reorder" }).locator("> li");
  const count = await sections.count();
  await expect(sections.nth(count - 1)).toContainText("Inventions");
  await sections.nth(count - 1).getByRole("button", { name: /^Reorder/ }).first().focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(300);
  for (let i = 0; i < 2; i += 1) {
    await page.keyboard.press("ArrowUp");
    await page.waitForTimeout(250);
  }
  await page.keyboard.press("Space");
  await expect(sections.nth(count - 3)).toContainText("Inventions");
  await saved(page);

  // Switch template: content is preserved.
  await page.getByRole("tab", { name: "Theme" }).click();
  await page.getByRole("radio", { name: /^Signal/ }).check({ force: true });
  await expect(preview.locator("[data-template]")).toHaveAttribute("data-template", "signal");
  await expect(preview.getByRole("heading", { level: 1, name: "Ada Tester" })).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Inventions" })).toBeVisible();
  await expect(preview.getByText("EP 1 234 567")).toBeVisible();
  await saved(page);

  // Undo / redo restores the previous template and back.
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(preview.locator("[data-template]")).toHaveAttribute("data-template", "swiss");
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(preview.locator("[data-template]")).toHaveAttribute("data-template", "signal");
  await saved(page);

  // Drafts are private until published.
  expect((await request.get(`/api/public/portfolios/${portfolioId}`)).status()).toBe(404);
  await page.getByTestId("publish").click();
  await expect(page.getByTestId("publish")).toHaveText("Published");
  const pub = await request.get(`/api/public/portfolios/${portfolioId}`);
  expect(pub.status()).toBe(200);
  const body = await pub.json();
  expect(body.portfolio.theme.templateId).toBe("signal");
  expect(body.portfolio.sections.some((s: { title: string }) => s.title === "Inventions")).toBe(true);

  // Deploy screen: generates the Vercel Deploy Button URL.
  await page.getByTestId("deploy").click();
  await page.waitForURL(new RegExp(`/deploy/${portfolioId}$`));
  const href = await page.getByTestId("deploy-link").getAttribute("href");
  const url = new URL(href!);
  expect(url.origin + url.pathname).toBe("https://vercel.com/new/clone");
  expect(url.searchParams.get("repository-url")).toBe("https://github.com/example/persona/tree/main/apps/runtime");
  expect(url.searchParams.get("project-name")).toBe(`${slug}-portfolio`);
  expect(url.searchParams.get("env")).toBe("PORTFOLIO_ID,BUILDER_URL");
  expect(JSON.parse(url.searchParams.get("envDefaults")!)).toEqual({ PORTFOLIO_ID: portfolioId, BUILDER_URL: "http://localhost:3100" });

  // The build ping flips the status screen to "live".
  await expect(page.getByRole("heading", { name: "Waiting for your first build" })).toBeVisible();
  const ping = await request.post("/api/public/deployments", { data: { portfolioId, vercelUrl: `${slug}-portfolio.vercel.app`, templateId: "signal", runtimeVersion: "1.0.0" } });
  expect(ping.status()).toBe(202);
  await expect(page.getByTestId("live-url")).toHaveText(new RegExp(`${slug}-portfolio.vercel.app`));
  await expect(page.getByRole("heading", { name: "Your site is live" })).toBeVisible();

  // Hosted preview (noindex) and zip download.
  const hosted = await page.request.get(`/p/${slug}`);
  expect(hosted.status()).toBe(200);
  expect(await hosted.text()).toContain('name="robots" content="noindex, nofollow"');
  const zip = await page.request.get(`/api/portfolios/${portfolioId}/zip`);
  expect(zip.status()).toBe(200);
  expect(zip.headers()["content-type"]).toBe("application/zip");
  expect((await zip.body()).subarray(0, 2).toString()).toBe("PK");

  // Dashboard shows it as live.
  await page.goto("/dashboard");
  await expect(page.getByRole("listitem").filter({ hasText: slug }).getByText("Live", { exact: true })).toBeVisible();
});

test("security: CSRF, auth and validation on API boundaries", async ({ request, page }) => {
  // Mutations without our origin + header are blocked.
  expect((await request.post("/api/portfolios", { data: {}, headers: { origin: "https://evil.example" } })).status()).toBe(403);
  expect((await request.post("/api/portfolios", { data: {} })).status()).toBe(403);
  // Authenticated routes need a session.
  expect((await request.get("/api/portfolios")).status()).toBe(401);
  expect((await request.get("/api/admin/stats")).status()).toBe(401);
  // Public deploy ping validates its body.
  expect((await request.post("/api/public/deployments", { data: { portfolioId: "nope", vercelUrl: "localhost", templateId: "x", runtimeVersion: "1" } })).status()).toBe(422);
  expect((await request.get("/api/public/portfolios/not-a-uuid")).status()).toBe(404);
  // Non-admins cannot open the admin API or page.
  await signIn(page, `plain-${uid()}@example.com`);
  expect((await page.request.get("/api/admin/stats")).status()).toBe(403);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { level: 1, name: /different career path/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Admin" })).toHaveCount(0);
  // Other users' portfolios are invisible.
  expect((await page.request.get("/api/portfolios/00000000-0000-4000-8000-000000000000")).status()).toBe(404);
});
