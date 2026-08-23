import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/password";

export const DEMO_USER_EMAIL = "demo@solobill.local";
export const DEMO_USER_PASSWORD = "SoloBill-Mvp-2026!";

export async function seedDemoUser(): Promise<{ email: string }> {
  const hashed = await hashPassword(DEMO_USER_PASSWORD);
  const user = await prisma.user.upsert({
    where: { email: DEMO_USER_EMAIL },
    create: { email: DEMO_USER_EMAIL, password: hashed },
    update: { password: hashed },
  });
  await prisma.businessProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      email: DEMO_USER_EMAIL,
      displayName: "SoloBill Demo",
      invoicePrefix: "INV",
      nextInvoiceSequence: 1,
    },
    update: {
      email: DEMO_USER_EMAIL,
    },
  });

  const clientCount = await prisma.client.count({ where: { userId: user.id } });
  if (clientCount === 0) {
    await prisma.client.create({
      data: {
        userId: user.id,
        name: "Acme Studio",
        email: "billing@acme.test",
        companyName: "Acme Studio LLC",
      },
    });
  }

  return { email: user.email };
}
