import fs from "node:fs";
import path from "node:path";

import { createClient } from "@libsql/client";

import { seedDemoUser } from "@/lib/seed-demo-user";

const MIGRATION_DIRS = [
  "20260421170304_init",
  "20260421173236_invoice_title_line_items",
  "20260812143000_billing_domain",
] as const;

let setupPromise: Promise<boolean> | null = null;

function isLibsqlUrl(raw: string | undefined): boolean {
  if (!raw?.trim()) {
    return false;
  }
  const t = raw.trim();
  return (
    t.startsWith("libsql://") ||
    ((t.startsWith("https://") || t.startsWith("wss://")) && t.includes("libsql"))
  );
}

export function isMissingSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("no such table") ||
    message.includes("SQLITE_ERROR") ||
    message.includes("SQLITE_UNKNOWN") ||
    message.includes("does not exist")
  );
}

async function applyTursoMigrations(): Promise<void> {
  const url = process.env.DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) {
    throw new Error("Turso credentials are missing on the server.");
  }

  const client = createClient({ url, authToken });
  for (const dir of MIGRATION_DIRS) {
    const filePath = path.join(process.cwd(), "prisma/migrations", dir, "migration.sql");
    const sql = fs.readFileSync(filePath, "utf8");
    console.log(`[remote-setup] applying migration ${dir}`);
    await client.executeMultiple(sql);
  }
}

async function runRemoteSetup(): Promise<boolean> {
  if (!process.env.VERCEL || !isLibsqlUrl(process.env.DATABASE_URL)) {
    return false;
  }

  console.log("[remote-setup] bootstrapping Turso schema and demo user…");
  await applyTursoMigrations();
  await seedDemoUser();
  return true;
}

/** Best-effort one-time Turso bootstrap for hosted demo login. */
export async function ensureRemoteDatabaseReady(error: unknown): Promise<boolean> {
  if (!isMissingSchemaError(error)) {
    return false;
  }
  if (!setupPromise) {
    setupPromise = runRemoteSetup().catch((setupError) => {
      setupPromise = null;
      console.error("[remote-setup] failed:", setupError);
      throw setupError;
    });
  }
  return setupPromise;
}
