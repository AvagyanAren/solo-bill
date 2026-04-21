/**
 * One-off: create a local demo user (bcrypt + Prisma).
 * Run from project root: npx tsx scripts/seed-dev-user.ts
 */
import "dotenv/config";

import { prisma } from "../lib/db";
import { hashPassword } from "../lib/password";

const EMAIL = "demo@solobill.local";
const PASSWORD = "SoloBill-Mvp-2026!";

async function main() {
  const hashed = await hashPassword(PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    create: { email: EMAIL, password: hashed },
    update: { password: hashed },
  });
  console.log("OK — user ready:", user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
