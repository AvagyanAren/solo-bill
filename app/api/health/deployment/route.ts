import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

function databaseUrlKind(raw: string | undefined): "missing" | "libsql" | "file" | "other" {
  if (!raw?.trim()) {
    return "missing";
  }
  const t = raw.trim();
  if (t.startsWith("libsql://")) {
    return "libsql";
  }
  if (t.startsWith("file:")) {
    return "file";
  }
  if ((t.startsWith("wss://") || t.startsWith("https://")) && t.includes("libsql")) {
    return "libsql";
  }
  return "other";
}

/** Safe deployment snapshot — no secrets, for debugging Vercel env. */
export async function GET() {
  const authSecret = process.env.AUTH_SECRET?.trim() ?? "";
  const kind = databaseUrlKind(process.env.DATABASE_URL);

  const issues: string[] = [];
  if (process.env.VERCEL) {
    if (kind !== "libsql") {
      issues.push("DATABASE_URL must be libsql:// on Vercel (currently: " + kind + ").");
    }
    if (!process.env.TURSO_AUTH_TOKEN?.trim()) {
      issues.push("TURSO_AUTH_TOKEN is missing.");
    }
  }
  if (process.env.NODE_ENV === "production" && authSecret.length < 32) {
    issues.push("AUTH_SECRET must be at least 32 characters in production.");
  }

  let userCount: number | null = null;
  let dbError: string | null = null;
  try {
    userCount = await prisma.user.count();
  } catch (error) {
    dbError = error instanceof Error ? error.message : String(error);
    issues.push("Database query failed: " + dbError);
  }

  return NextResponse.json({
    ok: issues.length === 0,
    issues,
    runtime: {
      vercel: Boolean(process.env.VERCEL),
      nodeEnv: process.env.NODE_ENV ?? null,
      region: process.env.VERCEL_REGION ?? null,
    },
    env: {
      hasDatabaseUrl: Boolean(process.env.DATABASE_URL?.trim()),
      databaseUrlKind: kind,
      hasTursoToken: Boolean(process.env.TURSO_AUTH_TOKEN?.trim()),
      hasAuthSecret: authSecret.length >= 32,
      authSecretLength: authSecret.length,
    },
    database: {
      userCount,
      dbError,
    },
  });
}
