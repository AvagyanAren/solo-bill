/**
 * Captures SoloBill pages into Figma (CSP-safe Playwright flow).
 * Requires: npm run dev on :3000
 */
import { chromium } from "playwright";
import Database from "better-sqlite3";
import path from "node:path";

const BASE = "http://localhost:3000";
const DEMO_EMAIL = "demo@solobill.local";
const DEMO_PASSWORD = "SoloBill-Mvp-2026!";

function resolveDemoIds() {
  const db = new Database(path.join(process.cwd(), "dev.db"));
  const user = db.prepare("SELECT id FROM User WHERE email = ?").get(DEMO_EMAIL);
  if (!user) {
    db.close();
    throw new Error("demo user missing — run npx tsx scripts/seed-dev-user.ts");
  }
  const client = db
    .prepare("SELECT id FROM Client WHERE userId = ? ORDER BY createdAt DESC LIMIT 1")
    .get(user.id);
  const invoice = db
    .prepare("SELECT id FROM Invoice WHERE userId = ? ORDER BY createdAt DESC LIMIT 1")
    .get(user.id);
  db.close();
  return {
    clientId: process.env.SOLOBILL_CLIENT_ID ?? client?.id,
    invoiceId: process.env.SOLOBILL_INVOICE_ID ?? invoice?.id,
  };
}

const { clientId: CLIENT_ID, invoiceId: INVOICE_ID } = resolveDemoIds();
if (!CLIENT_ID || !INVOICE_ID) {
  throw new Error("Need at least one client and invoice for demo capture");
}

const PAGES = [
  { name: "01 Home", path: "/", captureId: "01aa5887-c9b7-4698-a1ec-c06739778c01", loggedOut: true },
  { name: "02 Login", path: "/login", captureId: "cb07fa79-0452-493f-b45f-c8d29084ded3", loggedOut: true },
  { name: "03 Register", path: "/register", captureId: "8d0a5d34-f0d4-442b-a9a9-38fa11bcb6be", loggedOut: true },
  { name: "04 Dashboard", path: "/dashboard", captureId: "a0fd8ade-57eb-48c5-8c3a-1cd952c0e717" },
  { name: "05 Clients", path: "/dashboard/clients", captureId: "2d1fa1fd-84ad-4879-b39f-d47cf924b195" },
  { name: "06 New client", path: "/dashboard/clients/new", captureId: "1902a880-ca5c-4f62-8f98-819a99c9b968" },
  { name: "07 Edit client", path: `/dashboard/clients/${CLIENT_ID}/edit`, captureId: "06926f55-39c9-473e-97d7-3b17aa61bb28" },
  { name: "08 Invoices", path: "/dashboard/invoices", captureId: "231e24c0-5aee-4c83-add3-683158485713" },
  { name: "09 New invoice", path: "/invoice/new", captureId: "cc822181-8426-4a1b-9cd9-6144ffcf145e" },
  { name: "10 Invoice detail", path: `/invoice/${INVOICE_ID}`, captureId: "e3c80485-eb77-4554-876c-a43734e6df58" },
];

async function setupCspBypass(page) {
  await page.route("**/*", async (route) => {
    const response = await route.fetch();
    const headers = { ...response.headers() };
    delete headers["content-security-policy"];
    delete headers["content-security-policy-report-only"];
    await route.fulfill({ response, headers });
  });
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1000);
  await page.locator('input[name="email"]').fill(DEMO_EMAIL);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL((url) => url.pathname.includes("/dashboard"), { timeout: 20000 });
}

async function capturePage(page, request, pathName, captureId) {
  const endpoint = `https://mcp.figma.com/mcp/capture/${captureId}/submit?bindVariables=true`;
  await page.goto(`${BASE}${pathName}`, { waitUntil: "load", timeout: 60000 });
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1500);

  const scriptText = await request
    .get("https://mcp.figma.com/mcp/html-to-design/capture.js")
    .then((r) => r.text());

  await page.addScriptTag({ content: scriptText });
  await page.waitForFunction(() => typeof window.figma?.captureForDesign === "function", null, {
    timeout: 20000,
  });

  await Promise.race([
    page.evaluate(
      ({ captureId: id, endpoint: ep }) =>
        window.figma.captureForDesign({ captureId: id, endpoint: ep, selector: "body" }),
      { captureId, endpoint },
    ),
    page.waitForTimeout(20000),
  ]);
  await page.waitForTimeout(5000);
  console.log(`  Done waiting for upload: ${pathName}`);
}

async function main() {
  console.log(`Using client=${CLIENT_ID} invoice=${INVOICE_ID}`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await setupCspBypass(page);
  const request = context.request;

  let loggedIn = false;

  for (const item of PAGES) {
    console.log(`Capturing ${item.name}…`);
    if (!item.loggedOut && !loggedIn) {
      await login(page);
      loggedIn = true;
    }
    if (item.loggedOut && loggedIn) {
      await context.clearCookies();
      loggedIn = false;
    }
    await capturePage(page, request, item.path, item.captureId);
  }

  await browser.close();
  console.log("All captures submitted.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
