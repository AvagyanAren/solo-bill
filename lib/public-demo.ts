import { loadEnvConfig } from "@next/env";

import { prisma } from "@/lib/db";

const ENV_PUBLIC = "SOLOBILL_PUBLIC_DEMO" as const;
const ENV_EMAIL = "SOLOBILL_DEMO_USER_EMAIL" as const;

/**
 * When enabled on the **hosted** app (Vercel, etc.), visitors get the demo user’s session without
 * signing in. Enable only for throwaway / shared demo data — never for private customer data.
 */
export function isPublicDemoMode(): boolean {
  loadEnvConfig(process.cwd());
  const v = process.env[ENV_PUBLIC]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function demoUserEmailFromEnv(): string {
  return (process.env[ENV_EMAIL] || "demo@solobill.local").trim();
}

/**
 * If public demo is on, returns the Prisma user that anonymous visitors use (must exist in DB—run
 * `npx tsx scripts/seed-dev-user.ts` in deploy or locally before enabling).
 */
export async function resolvePublicDemoUserSession(): Promise<{
  userId: string;
  email: string;
} | null> {
  if (!isPublicDemoMode()) {
    return null;
  }
  const email = demoUserEmailFromEnv();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });
  if (!user) {
    return null;
  }
  return { userId: user.id, email: user.email };
}

export function getPublicDemoConfig(): { showBanner: boolean; demoEmail: string } {
  if (!isPublicDemoMode()) {
    return { showBanner: false, demoEmail: demoUserEmailFromEnv() };
  }
  return { showBanner: true, demoEmail: demoUserEmailFromEnv() };
}
