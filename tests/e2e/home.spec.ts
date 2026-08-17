import { expect, test } from "@playwright/test";

test("shows the SoloBill entry point", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle(/SoloBill/i);
  await expect(page.getByRole("heading", { name: "SoloBill" })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in|go to dashboard/i })).toBeVisible();
});
