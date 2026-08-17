import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { bootstrapRemoteDatabase } from "@/lib/remote-setup";
import { seedDemoUser } from "@/lib/seed-demo-user";

function allowSetup(): boolean {
  const flag = process.env.SOLOBILL_ALLOW_SETUP?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

/**
 * Explicit one-shot hosted DB bootstrap (schema + demo user).
 * Prefer this over relying on first login. Disable `SOLOBILL_ALLOW_SETUP` after use.
 */
export async function POST() {
  if (!allowSetup()) {
    return NextResponse.json(
      {
        error:
          "Setup disabled. Set SOLOBILL_ALLOW_SETUP=1 on Vercel (Production), redeploy, POST once, then remove the flag.",
      },
      { status: 403 },
    );
  }

  try {
    const bootstrapped = await bootstrapRemoteDatabase();
    if (!bootstrapped) {
      // Local / non-Turso: still upsert demo user against the configured DB.
      await seedDemoUser();
    }
    const userCount = await prisma.user.count();
    const demo = await prisma.user.findUnique({
      where: { email: "demo@solobill.local" },
      select: { email: true },
    });

    return NextResponse.json({
      ok: true,
      bootstrapped,
      userCount,
      demoUser: demo?.email ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[setup] failed:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
