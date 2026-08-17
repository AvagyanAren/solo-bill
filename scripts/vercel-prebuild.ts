/**
 * Runs before `next build` on Vercel when DATABASE_URL is libsql://.
 * Pushes Prisma schema to Turso and upserts the demo user for hosted login.
 */
import { execSync } from "node:child_process";

function isLibsqlUrl(raw: string | undefined): boolean {
  if (!raw?.trim()) {
    return false;
  }
  const t = raw.trim();
  return t.startsWith("libsql://") || ((t.startsWith("https://") || t.startsWith("wss://")) && t.includes("libsql"));
}

function run(command: string): void {
  execSync(command, { stdio: "inherit", env: process.env });
}

function main(): void {
  const url = process.env.DATABASE_URL;
  if (!isLibsqlUrl(url)) {
    console.log("[vercel-prebuild] skip remote schema sync (DATABASE_URL is not libsql)");
    return;
  }

  console.log("[vercel-prebuild] pushing schema to Turso/libSQL…");
  run("npx prisma db push --skip-generate");

  console.log("[vercel-prebuild] seeding demo user…");
  run("npx tsx scripts/seed-dev-user.ts");
}

main();
