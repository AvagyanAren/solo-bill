import { expect, test } from "@playwright/test";

const DEMO_EMAIL = "demo@solobill.local";
const DEMO_PASSWORD = "SoloBill-Mvp-2026!";

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

test("legacy /clients redirects to dashboard clients", async ({ page }) => {
  await signIn(page);
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/dashboard\/clients$/);
  await expect(page.getByRole("heading", { name: /^clients$/i })).toBeVisible();
});

test("legacy /dashboard/invoices/new redirects to invoice create", async ({ page }) => {
  await signIn(page);
  await page.goto("/dashboard/invoices/new");
  await expect(page).toHaveURL(/\/invoice\/new$/);
  await expect(page.getByRole("heading", { name: /create invoice/i })).toBeVisible();
});
