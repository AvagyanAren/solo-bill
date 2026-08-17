import "dotenv/config";

import { seedDemoUser } from "../lib/seed-demo-user";
import { prisma } from "../lib/db";

async function main() {
  const user = await seedDemoUser();
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
