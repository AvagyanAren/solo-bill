import { expect, test } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "https://solo-bill-coral.vercel.app";

test.use({ baseURL: BASE });

test("measure menu navigation latency", async ({ page }) => {
  test.setTimeout(120_000);

  await page.goto("/login");
  await page.locator('input[name="email"]').fill("demo@solobill.local");
  await page.locator('input[name="password"]').fill("SoloBill-Mvp-2026!");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/);

  const hops = [
    { label: "dashboard->invoices", href: /invoices/i, expectUrl: /\/dashboard\/invoices/ },
    { label: "invoices->clients", href: /^clients$/i, expectUrl: /\/dashboard\/clients/ },
    { label: "clients->settings", href: /settings/i, expectUrl: /\/dashboard\/settings/ },
    { label: "settings->dashboard", href: /dashboard/i, expectUrl: /\/dashboard$/ },
  ];

  for (const hop of hops) {
    const started = Date.now();
    await page.getByRole("link", { name: hop.href }).first().click();
    await expect(page).toHaveURL(hop.expectUrl);
    const ms = Date.now() - started;
    console.log(`NAV_TIMING ${hop.label}=${ms}ms`);
  }
});
