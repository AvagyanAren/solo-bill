import { execSync } from "node:child_process";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { seedDemoUser } from "@/lib/seed-demo-user";

function allowSetup(): boolean {
  const flag = process.env.SOLOBILL_ALLOW_SETUP?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

/** One-time hosted DB bootstrap: prisma db push + demo user seed. */
export async function POST() {
  if (!allowSetup()) {
    return NextResponse.json(
      { error: "Setup disabled. Set SOLOBILL_ALLOW_SETUP=1 on Vercel, redeploy, POST again, then remove the flag." },
      { status: 403 },
    );
  }

  try {
    execSync("npx prisma db push", { stdio: "pipe", env: process.env });
    const demo = await seedDemoUser();
    const userCount = await prisma.user.count();

    return NextResponse.json({
      ok: true,
      userCount,
      demoUser: demo.email,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[setup] failed:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
