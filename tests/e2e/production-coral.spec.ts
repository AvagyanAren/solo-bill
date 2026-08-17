import { expect, test } from "@playwright/test";

const PRODUCTION_URL = process.env.PLAYWRIGHT_BASE_URL ?? "https://solo-bill-coral.vercel.app";

test.use({ baseURL: PRODUCTION_URL });

test("production health endpoint reports valid env", async ({ request }) => {
  const response = await request.get("/api/health/deployment");
  expect(response.status()).toBe(200);
  const body = (await response.json()) as {
    ok: boolean;
    issues: string[];
    env: { databaseUrlKind: string; hasTursoToken: boolean; hasAuthSecret: boolean };
  };
  expect(body.ok, JSON.stringify(body.issues)).toBe(true);
  expect(body.env.databaseUrlKind).toBe("libsql");
  expect(body.env.hasTursoToken).toBe(true);
  expect(body.env.hasAuthSecret).toBe(true);
});

test("production login reaches dashboard", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.locator('input[name="email"]').fill("demo@solobill.local");
  await page.locator('input[name="password"]').fill("SoloBill-Mvp-2026!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);
});
