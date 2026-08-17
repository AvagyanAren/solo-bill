const ENV_PUBLIC = "SOLOBILL_PUBLIC_DEMO" as const;

function readTruthyFlag(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/**
 * Edge-safe public-demo flag check (no Prisma / Node-only imports).
 * Middleware must use this module only — not `@/lib/public-demo`.
 */
export function isPublicDemoModeFromEnv(): boolean {
  return readTruthyFlag(process.env[ENV_PUBLIC]);
}
