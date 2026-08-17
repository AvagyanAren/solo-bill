/**
 * Verify Turso/libSQL connectivity using .env (or shell env).
 * Usage: npx tsx scripts/check-turso.ts
 */
import "dotenv/config";

import { prisma } from "../lib/db";

async function main() {
  const url = process.env.DATABASE_URL?.trim() ?? "";
  const hasToken = Boolean(process.env.TURSO_AUTH_TOKEN?.trim());
  const kind = url.startsWith("libsql://")
    ? "libsql"
    : url.startsWith("file:")
      ? "file"
      : url
        ? "other"
        : "missing";

  console.log("DATABASE_URL kind:", kind);
  console.log("TURSO_AUTH_TOKEN set:", hasToken);
  console.log("AUTH_SECRET length:", process.env.AUTH_SECRET?.trim().length ?? 0);

  if (kind !== "libsql") {
    console.error("Expected DATABASE_URL=libsql://… for Turso.");
    process.exit(1);
  }
  if (!hasToken) {
    console.error("TURSO_AUTH_TOKEN is missing.");
    process.exit(1);
  }

  const count = await prisma.user.count();
  console.log("OK — connected. User count:", count);

  const demo = await prisma.user.findUnique({
    where: { email: "demo@solobill.local" },
    select: { id: true, email: true },
  });
  console.log("Demo user:", demo ? demo.email : "NOT FOUND (run seed-dev-user.ts)");
}

main()
  .catch((error) => {
    console.error("FAIL:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
