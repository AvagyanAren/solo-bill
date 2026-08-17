import Link from "next/link";

import { InvoiceCreateFlow } from "@/components/invoice-create-flow";
import { PageContainer, PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { cx } from "@/lib/utils/cx";
import { isInvoiceAiMockMode } from "@/lib/openai-invoice";
import { requireSession } from "@/lib/require-session";

export default async function NewInvoicePage() {
  const session = await requireSession();
  const mockInvoiceAi = isInvoiceAiMockMode();
  const [clients, profile] = await Promise.all([
    prisma.client.findMany({
      where: { userId: session.userId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, preferredCurrency: true },
    }),
    prisma.businessProfile.findUnique({
      where: { userId: session.userId },
      select: { defaultPaymentTermsDays: true, defaultCurrency: true },
    }),
  ]);

  if (clients.length === 0) {
    return (
      <PageContainer>
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-base">Add a client first</CardTitle>
            <CardDescription>Invoices are billed to someone in your client list.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/clients/new" className={cx(buttonVariants(), "inline-flex min-h-11")}>
              Add client
            </Link>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageShell
      title="Create invoice"
      description={
        <>
          Describe the work in your own words — we&apos;ll draft line items you can edit before saving.
        </>
      }
      lead={
        <Link
          href="/dashboard"
          className={cx(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-11")}
        >
          ← Back to dashboard
        </Link>
      }
      contentClassName="mt-8 space-y-3"
    >
      {mockInvoiceAi ? (
        <p className="rounded-lg bg-warning-primary px-3 py-2 text-sm text-warning-primary ring-1 ring-warning ring-inset">
          <strong>Preview mode:</strong> OpenAI is off — sample line items are filled so you can try the flow without
          an API key or quota. Set <code className="rounded bg-warning-secondary px-1">SOLOBILL_MOCK_INVOICE_AI=0</code> in
          <code className="rounded bg-warning-secondary px-1">.env</code> to use the real model again.
        </p>
      ) : null}
      <InvoiceCreateFlow
        clients={clients}
        mockInvoiceAi={mockInvoiceAi}
        devDefaultsToSample={process.env.NODE_ENV === "development"}
        defaultPaymentTermsDays={profile?.defaultPaymentTermsDays ?? 14}
        defaultCurrency={profile?.defaultCurrency ?? "USD"}
      />
    </PageShell>
  );
}
