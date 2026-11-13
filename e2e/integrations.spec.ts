import { expect, test, type APIResponse, type Page } from "@playwright/test";
import { createPortfolio, saved, signIn, uid } from "./helpers";

const BUILDER = "http://localhost:3100";
const HEADERS = { origin: BUILDER, "x-persona-csrf": "1" };

type Section = { id: string; title: string; visible: boolean; items?: { id: string }[]; sync?: { provider: string; account: string; verified: boolean; live?: boolean } };
type Doc = { sections: Section[]; integrations?: unknown[] };

const post = (page: Page, path: string, data: unknown = {}) => page.request.post(path, { data, headers: HEADERS });
const ok = async (res: APIResponse) => {
  expect(res.status(), await res.text()).toBeLessThan(300);
  return res.json();
};

/**
 * The integrations API end to end, in LOCAL_MODE with the mock provider (no
 * network): connect → preview → hide a metric → publish → the public endpoint
 * and the hosted page show the data → verify → disconnect removes it.
 */
test("API: connect → preview → toggle → publish → public data → verify → disconnect", async ({ page, request }) => {
  const id = uid();
  await signIn(page, `int-${id}@example.com`, "/new");
  const portfolioId = await createPortfolio(page, { template: "Swiss", start: "Developer", name: "Ivy Integrations", slug: `int-${id}` });
  await saved(page);
  const base = `/api/portfolios/${portfolioId}/integrations`;

  // The feature is on in e2e and offers the mock provider, labelled experimental.
  const list = await ok(await page.request.get(base));
  expect(list.enabled).toBe(true);
  expect(list.providers).toContainEqual(expect.objectContaining({ id: "mock", official: false }));
  expect(list.connections).toEqual([]);

  // Cross-site requests and other users are refused; bad handles never reach the provider.
  expect((await page.request.post(base, { data: { provider: "mock", account: "owner-ivy" } })).status()).toBe(403);
  expect((await request.get(base)).status()).toBe(401);
  expect((await post(page, base, { provider: "mock", account: "Not A Handle" })).status()).toBe(422);
  expect((await post(page, base, { provider: "nope", account: "ivy" })).status()).toBe(404);
  expect((await post(page, base, { provider: "mock", account: "missing" })).status()).toBe(404);
  expect((await post(page, base, { provider: "mock", account: "down" })).status()).toBe(502);

  // Connect: one fetch, a snapshot, and a preview of the sections.
  const connected = await ok(await post(page, base, { provider: "mock", account: "owner-ivy" }));
  const integrationId: string = connected.config.id;
  expect(connected.sections.map((s: Section) => s.title)).toEqual(["Mock Judge", "Mock Judge badges"]);
  expect(connected.sections[0].sync).toMatchObject({ provider: "mock", account: "owner-ivy", verified: false, experimental: true });
  expect(connected.connection.verifyCode).toMatch(/^persona-[A-Z2-9]{6}$/);
  expect((await post(page, base, { provider: "mock", account: "owner-ivy" })).status()).toBe(409);

  // Preview with a metric hidden and badges switched off: computed from the snapshot, no provider call.
  const preview = await ok(await post(page, `${base}/${integrationId}/preview`, { options: { badges: false }, hidden: ["stats#streak"] }));
  expect(preview.sections).toHaveLength(1);
  expect(preview.sections[0].items.map((i: { id: string }) => i.id)).toEqual(["solved"]);
  expect(preview.connection.available).toHaveLength(1);

  // Save the choice into the draft (as the editor does) and publish.
  const { portfolio } = await ok(await page.request.get(`/api/portfolios/${portfolioId}`));
  const draft: Doc = portfolio.draft;
  const contact = draft.sections.length - 1;
  draft.sections.splice(contact, 0, { ...preview.sections[0], title: "Judge numbers" });
  draft.integrations = [preview.config];
  await ok(await page.request.patch(`/api/portfolios/${portfolioId}`, { data: { draft }, headers: HEADERS }));
  await ok(await post(page, `/api/portfolios/${portfolioId}/publish`));

  // The public endpoint serves the snapshot where the user put it, under the user's title.
  const pub = async (): Promise<Doc> => (await ok(await request.get(`/api/public/portfolios/${portfolioId}`))).portfolio;
  let synced = (await pub()).sections.filter((s) => s.sync);
  expect(synced.map((s) => s.title)).toEqual(["Judge numbers"]);
  expect(synced[0]!.items!.map((i) => i.id)).toEqual(["solved"]);
  expect(synced[0]!.sync).toMatchObject({ verified: false });

  // …and so does the hosted page, with honest provenance.
  await page.goto(`/p/int-${id}`);
  await expect(page.getByRole("heading", { name: "Judge numbers" })).toBeVisible();
  await expect(page.getByText("problems solved", { exact: true })).toBeVisible();
  await expect(page.locator(".pf-chart svg[role=img]")).toHaveCount(1);
  await expect(page.locator(".pf-sync")).toContainText(/Live from mock\.example\.com · updated .+ · Public profile · Experimental/);

  // Verify ownership: the published site flips to "Verified owner" without a republish.
  const verified = await ok(await post(page, `${base}/${integrationId}/verify`));
  expect(verified.verified).toBe(true);
  expect(verified.connection.verifyCode).toBeNull();
  expect((await pub()).sections.find((s) => s.sync)!.sync).toMatchObject({ verified: true });

  // Manual refresh works once, then is limited to once per 10 minutes.
  expect((await ok(await post(page, `${base}/${integrationId}/refresh`))).connection.status).toBe("ok");
  expect((await post(page, `${base}/${integrationId}/refresh`)).status()).toBe(429);

  // The zip bakes the snapshot in, marked as no longer live.
  const zip = await page.request.get(`/api/portfolios/${portfolioId}/zip`);
  expect(zip.status()).toBe(200);
  expect((await zip.body()).byteLength).toBeGreaterThan(10_000);

  // Another user cannot touch the connection.
  const other = await page.context().browser()!.newContext();
  const otherPage = await other.newPage();
  await signIn(otherPage, `other-${id}@example.com`);
  expect((await otherPage.request.delete(`${BUILDER}${base}/${integrationId}`, { headers: HEADERS })).status()).toBe(404);
  await other.close();

  // Disconnect deletes the snapshot: the data is gone from the public site at once.
  await ok(await page.request.delete(`${base}/${integrationId}`, { headers: HEADERS }));
  expect((await pub()).sections.some((s) => s.sync)).toBe(false);
  expect((await ok(await page.request.get(base))).connections).toEqual([]);
  expect((await post(page, `${base}/${integrationId}/refresh`)).status()).toBe(404);
});

/**
 * The Connected accounts panel, as a person uses it: connect, choose what
 * appears, verify, publish, see it live, disconnect. Keyboard and labels only.
 */
test("Editor: connect → preview → toggle → verify → publish → public page → disconnect", async ({ page, request }) => {
  const id = uid();
  await signIn(page, `int-ui-${id}@example.com`, "/new");
  const portfolioId = await createPortfolio(page, { template: "Signal", start: "Developer", name: "Uma Interface", slug: `int-ui-${id}` });
  await saved(page);
  const preview = page.frameLocator('iframe[title="Live preview of your portfolio"]');

  await page.getByRole("tab", { name: "Accounts" }).click();
  await expect(page.getByRole("heading", { name: "Connected accounts" })).toBeVisible();
  await page.locator("label", { hasText: "Mock Judge" }).click();
  const handle = page.getByLabel("Mock Judge handle");

  // A malformed handle is caught before any request; a missing account is reported inline.
  await handle.fill("Not A Handle");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByText("That does not look like a Mock Judge handle.")).toBeVisible();
  await handle.fill("missing");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByText("No such account.")).toBeVisible();

  await handle.fill("owner-uma");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  const card = page.locator("[data-connection=mock]");
  await expect(card.getByRole("heading", { name: /Mock Judge · owner-uma/ })).toBeVisible();
  await expect(card.getByText("Experimental")).toBeVisible();
  await expect(card.getByText("Public profile")).toBeVisible();
  await expect(card.getByTestId("synced-at")).toContainText("Last synced");

  // The live preview shows the synced data straight away, with provenance.
  await expect(preview.getByRole("heading", { name: "Mock Judge", exact: true })).toBeVisible();
  await expect(preview.getByText("day streak", { exact: true })).toBeVisible();
  await expect(preview.locator(".pf-sync").first()).toContainText("Public profile · Experimental");

  // Hide one metric and switch badges off.
  await card.getByRole("checkbox", { name: "day streak" }).uncheck();
  await expect(preview.getByText("day streak", { exact: true })).toHaveCount(0);
  await card.getByRole("checkbox", { name: "Show badges" }).uncheck();
  await expect(preview.getByRole("heading", { name: "Mock Judge badges" })).toHaveCount(0);

  // Synced sections are listed with a lock and are read-only.
  await page.getByRole("tab", { name: "Content" }).click();
  await page.getByRole("button", { name: /Mock Judge\s*Synced/ }).click();
  await expect(page.getByText("This content updates itself and is read-only.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete section Mock Judge" })).toHaveCount(0);
  await page.getByLabel("Section title").last().fill("Judge stats");
  await page.getByRole("button", { name: "Choose what appears" }).click();

  // Verify ownership with the bio code.
  await expect(card.getByTestId("verify-code")).toHaveText(/^persona-[A-Z2-9]{6}$/);
  await card.getByRole("button", { name: "Verify" }).click();
  await expect(card.getByText("Verified owner")).toBeVisible();
  await expect(card.getByTestId("verify-code")).toHaveCount(0);

  // The Achievement wall gathers verified highlights from the other accounts, each with its source.
  await page.locator("label", { hasText: "Achievement wall" }).click();
  await page.getByRole("button", { name: "Add Achievement wall" }).click();
  await expect(page.locator("[data-connection=achievements]")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Achievement wall/ })).toHaveCount(0);
  await expect(preview.getByText("Mock Judge problems solved", { exact: true })).toBeVisible();
  await expect(preview.getByText("mock.example.com · Verified owner")).toBeVisible();

  await saved(page);
  await page.getByTestId("publish").click();
  await expect(page.getByTestId("publish")).toHaveText("Published");

  const pub = async () => (await (await request.get(`/api/public/portfolios/${portfolioId}`)).json()).portfolio as Doc;
  const synced = (await pub()).sections.filter((s) => s.sync);
  expect(synced.map((s) => s.title)).toEqual(["Judge stats", "Achievements"]);
  expect(synced[0]!.items!.map((i) => i.id)).toEqual(["solved"]);
  expect(synced[0]!.sync).toMatchObject({ provider: "mock", account: "owner-uma", verified: true });

  await page.goto(`/p/int-ui-${id}`);
  await expect(page.getByRole("heading", { name: "Judge stats" })).toBeVisible();
  await expect(page.locator(".pf-sync").first()).toContainText("Verified owner");

  // Disconnect, after confirming: the data leaves the draft and the public site.
  await page.goto(`/edit/${portfolioId}`);
  await page.getByRole("tab", { name: "Accounts" }).click();
  await card.getByRole("button", { name: "Disconnect" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Disconnect" }).click();
  await expect(card).toHaveCount(0);
  await expect(preview.getByRole("heading", { name: "Judge stats" })).toHaveCount(0);
  expect((await pub()).sections.some((s) => s.sync)).toBe(false);
  await saved(page);
});
