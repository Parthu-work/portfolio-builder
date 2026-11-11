import { expect, type Page } from "@playwright/test";

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export async function signIn(page: Page, email: string, next = "/dashboard") {
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => u.pathname === next.split("?")[0]);
}

/** Creates a portfolio through the onboarding wizard and lands in the editor. Returns its id. */
export async function createPortfolio(page: Page, opts: { template: string; start: string; name: string; slug: string }) {
  await page.goto("/new");
  await page.getByRole("radio", { name: new RegExp(`^${opts.template}`) }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("radio", { name: new RegExp(opts.start) }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Your name").fill(opts.name);
  await page.getByLabel("Address").fill(opts.slug);
  await expect(page.getByText("✓ Available")).toBeVisible();
  await page.getByRole("button", { name: "Create portfolio" }).click();
  await page.waitForURL(/\/edit\/[0-9a-f-]{36}$/);
  return page.url().split("/").pop()!;
}

export const saved = (page: Page) => expect(page.getByTestId("save-status")).toHaveAttribute("data-status", "saved", { timeout: 20_000 });
