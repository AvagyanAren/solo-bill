import { execSync } from "node:child_process";

import { seedDemoUser } from "@/lib/seed-demo-user";

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

function isMissingSchemaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("no such table") ||
    message.includes("SQLITE_ERROR") ||
    message.includes("does not exist")
  );
}

async function runRemoteSetup(): Promise<boolean> {
  if (!process.env.VERCEL || !isLibsqlUrl(process.env.DATABASE_URL)) {
    return false;
  }

  console.log("[remote-setup] applying schema and demo seed to Turso…");
  execSync("npx prisma db push", { stdio: "inherit", env: process.env });
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
      throw setupError;
    });
  }
  return setupPromise;
}

export { isMissingSchemaError };
