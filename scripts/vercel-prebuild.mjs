/**
 * Runs before `next build` on Vercel when DATABASE_URL is libsql://.
 */
import { execSync } from "node:child_process";

function isLibsqlUrl(raw) {
  if (!raw?.trim()) {
    return false;
  }
  const t = raw.trim();
  return (
    t.startsWith("libsql://") ||
    ((t.startsWith("https://") || t.startsWith("wss://")) && t.includes("libsql"))
  );
}

function run(command) {
  execSync(command, { stdio: "inherit", env: process.env });
}

function main() {
  if (!isLibsqlUrl(process.env.DATABASE_URL)) {
    console.log("[vercel-prebuild] skip remote schema sync (DATABASE_URL is not libsql)");
    return;
  }

  console.log("[vercel-prebuild] pushing schema to Turso/libSQL…");
  run("npx prisma db push");

  console.log("[vercel-prebuild] seeding demo user…");
  run("npx --yes tsx scripts/seed-dev-user.ts");
}

main();
