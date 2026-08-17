import fs from "node:fs";
import path from "node:path";

import { createClient } from "@libsql/client";

import { isLibsqlConnectionString } from "@/lib/db-url";
import { seedDemoUser } from "@/lib/seed-demo-user";

/**
 * Ordered Prisma migration folders applied once when the User table is missing.
 * Keep in sync with `prisma/migrations/`.
 */
const MIGRATION_DIRS = [
  "20260421170304_init",
  "20260421173236_invoice_title_line_items",
  "20260812143000_billing_domain",
] as const;

let setupPromise: Promise<boolean> | null = null;

export function isMissingSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("no such table") ||
    message.includes("SQLITE_ERROR") ||
    message.includes("SQLITE_UNKNOWN") ||
    message.includes("does not exist")
  );
}

function canBootstrapRemote(): boolean {
  return Boolean(process.env.VERCEL) && isLibsqlConnectionString(process.env.DATABASE_URL);
}

async function tursoClient() {
  const url = process.env.DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken) {
    throw new Error("Turso credentials are missing on the server.");
  }
  return createClient({ url, authToken });
}

async function userTableExists(): Promise<boolean> {
  const client = await tursoClient();
  const result = await client.execute(
    "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = 'User' LIMIT 1",
  );
  return result.rows.length > 0;
}

async function applyTursoMigrations(): Promise<void> {
  const client = await tursoClient();
  for (const dir of MIGRATION_DIRS) {
    const filePath = path.join(process.cwd(), "prisma/migrations", dir, "migration.sql");
    const sql = fs.readFileSync(filePath, "utf8");
    console.log(`[remote-setup] applying migration ${dir}`);
    await client.executeMultiple(sql);
  }
}

/**
 * Idempotent hosted bootstrap: apply migrations only when `User` is missing, then upsert demo user.
 */
export async function bootstrapRemoteDatabase(): Promise<boolean> {
  if (!canBootstrapRemote()) {
    return false;
  }

  const hasUserTable = await userTableExists();
  if (!hasUserTable) {
    console.log("[remote-setup] User table missing — applying Prisma migrations…");
    await applyTursoMigrations();
  } else {
    console.log("[remote-setup] schema present — skipping migrations");
  }

  await seedDemoUser();
  return true;
}

async function runRemoteSetup(): Promise<boolean> {
  return bootstrapRemoteDatabase();
}

/**
 * After a missing-schema Prisma error, ensure Turso schema + demo user exist.
 * Safe to call from login/register; migrations run at most once per cold start when needed.
 */
export async function ensureRemoteDatabaseReady(error: unknown): Promise<boolean> {
  if (!isMissingSchemaError(error) || !canBootstrapRemote()) {
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

/**
 * Run a Prisma operation; on missing-schema errors, bootstrap Turso once and retry.
 */
export async function withRemoteDbRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (!(await ensureRemoteDatabaseReady(error))) {
      throw error;
    }
    return operation();
  }
}
