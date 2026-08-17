import { expect, test } from "@playwright/test";

const DEMO_EMAIL = "demo@solobill.local";
const DEMO_PASSWORD = "SoloBill-Mvp-2026!";

test("login reaches dashboard and opens invoices", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible();

  await page.getByRole("link", { name: /^invoices$/i }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/invoices/);
  await expect(page.getByRole("heading", { name: /invoices/i })).toBeVisible();
});
