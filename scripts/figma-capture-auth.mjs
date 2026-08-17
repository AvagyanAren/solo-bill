/**
 * Captures authenticated SoloBill pages 04–10 into Figma.
 */
import { chromium } from "playwright";
import Database from "better-sqlite3";
import path from "node:path";

const BASE = "http://localhost:3000";
const DEMO_EMAIL = "demo@solobill.local";
const DEMO_PASSWORD = "SoloBill-Mvp-2026!";

const db = new Database(path.join(process.cwd(), "dev.db"));
const user = db.prepare("SELECT id FROM User WHERE email = ?").get(DEMO_EMAIL);
const client = db
  .prepare("SELECT id FROM Client WHERE userId = ? ORDER BY createdAt DESC LIMIT 1")
  .get(user.id);
const invoice = db
  .prepare("SELECT id FROM Invoice WHERE userId = ? ORDER BY createdAt DESC LIMIT 1")
  .get(user.id);
db.close();

const PAGES = [
  { name: "04 Dashboard", path: "/dashboard", captureId: "a0fd8ade-57eb-48c5-8c3a-1cd952c0e717" },
  { name: "05 Clients", path: "/dashboard/clients", captureId: "2d1fa1fd-84ad-4879-b39f-d47cf924b195" },
  { name: "06 New client", path: "/dashboard/clients/new", captureId: "1902a880-ca5c-4f62-8f98-819a99c9b968" },
  { name: "07 Edit client", path: `/dashboard/clients/${client.id}/edit`, captureId: "06926f55-39c9-473e-97d7-3b17aa61bb28" },
  { name: "08 Invoices", path: "/dashboard/invoices", captureId: "231e24c0-5aee-4c83-add3-683158485713" },
  { name: "09 New invoice", path: "/invoice/new", captureId: "cc822181-8426-4a1b-9cd9-6144ffcf145e" },
  { name: "10 Invoice detail", path: `/invoice/${invoice.id}`, captureId: "e3c80485-eb77-4554-876c-a43734e6df58" },
];

async function setupCspBypass(page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const headers = { ...response.headers() };
    delete headers["content-security-policy"];
    delete headers["content-security-policy-report-only"];
    await route.fulfill({ response, headers });
  });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await setupCspBypass(page);

  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500);
  await page.locator('input[name="email"]').fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForTimeout(4000);
  if (!page.url().includes("/dashboard")) {
    throw new Error(`Login failed, still at ${page.url()}`);
  }
  console.log("Logged in at", page.url());

  for (const item of PAGES) {
    console.log(`Capturing ${item.name}…`);
    const endpoint = `https://mcp.figma.com/mcp/capture/${item.captureId}/submit?bindVariables=true`;
    await page.goto(`${BASE}${item.path}`, { waitUntil: "load", timeout: 60000 });
    await page.waitForTimeout(1500);
    const scriptText = await context.request
      .get("https://mcp.figma.com/mcp/html-to-design/capture.js")
      .then((r) => r.text());
    await page.addScriptTag({ content: scriptText });
    await page.waitForFunction(() => typeof window.figma?.captureForDesign === "function", null, {
      timeout: 20000,
    });
    await Promise.race([
      page.evaluate(
        ({ captureId, endpoint }) =>
          window.figma.captureForDesign({ captureId, endpoint, selector: "body" }),
        { captureId: item.captureId, endpoint },
      ),
      page.waitForTimeout(20000),
    ]);
    await page.waitForTimeout(5000);
    console.log(`  Done: ${item.path}`);
  }

  await browser.close();
  console.log("Authenticated captures submitted.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
