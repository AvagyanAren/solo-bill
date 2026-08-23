import { execSync } from "node:child_process";

/** Local/CI e2e: no .env or manual seed in the GitHub workflow — prepare SQLite + demo user here. */
const e2eEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? "file:./dev.db",
};

export default async function globalSetup() {
  execSync("npx prisma migrate deploy", { stdio: "inherit", cwd: process.cwd(), env: e2eEnv });
  execSync("npx tsx scripts/seed-dev-user.ts", { stdio: "inherit", cwd: process.cwd(), env: e2eEnv });
}
