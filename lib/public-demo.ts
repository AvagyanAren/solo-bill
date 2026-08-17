import { loadEnvConfig } from "@next/env";

import { prisma } from "@/lib/db";
import { isPublicDemoModeFromEnv } from "@/lib/public-demo-flag";

const ENV_EMAIL = "SOLOBILL_DEMO_USER_EMAIL" as const;

/**
 * When enabled on the **hosted** app (Vercel, etc.), visitors get the demo user’s session without
 * signing in. Enable only for throwaway / shared demo data — never for private customer data.
 *
 * For Edge middleware, use {@link isPublicDemoModeFromEnv} from `@/lib/public-demo-flag` instead
 * (this module pulls in Prisma).
 */
export function isPublicDemoMode(): boolean {
  if (isPublicDemoModeFromEnv()) {
    return true;
  }
  try {
    if (typeof process.cwd === "function") {
      loadEnvConfig(process.cwd());
    }
  } catch {
    /* ignore */
  }
  return isPublicDemoModeFromEnv();
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

export { isPublicDemoModeFromEnv } from "@/lib/public-demo-flag";
