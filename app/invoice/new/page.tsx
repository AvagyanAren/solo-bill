import Link from "next/link";

import { InvoiceCreateFlow } from "@/components/invoice-create-flow";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";
import { isInvoiceAiMockMode } from "@/lib/openai-invoice";
import { requireSession } from "@/lib/require-session";

export default async function NewInvoicePage() {
  const session = await requireSession();
  const mockInvoiceAi = isInvoiceAiMockMode();
  const clients = await prisma.client.findMany({
    where: { userId: session.userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  if (clients.length === 0) {
    return (
      <div className="p-6 md:p-8">
        <Card className="mx-auto max-w-md">
          <CardHeader>
            <CardTitle className="text-base">Add a client first</CardTitle>
            <CardDescription>Invoices are billed to someone in your client list.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/clients/new" className={cn(buttonVariants(), "inline-flex")}>
              Add client
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <Link href="/dashboard" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          ← Back to dashboard
        </Link>
      </div>
      <h1 className="text-xl font-semibold text-foreground">Create invoice</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Describe the work in your own words — we&apos;ll draft line items you can edit before saving.
      </p>
      {mockInvoiceAi ? (
        <p className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          <strong>Preview mode:</strong> OpenAI is off — sample line items are filled so you can try the flow without
          an API key or quota. Set <code className="rounded bg-amber-500/20 px-1">SOLOBILL_MOCK_INVOICE_AI=0</code> in
          <code className="rounded bg-amber-500/20 px-1">.env</code> to use the real model again.
        </p>
      ) : null}
      <div className="mt-8">
        <InvoiceCreateFlow
          clients={clients}
          mockInvoiceAi={mockInvoiceAi}
          devDefaultsToSample={process.env.NODE_ENV === "development"}
        />
      </div>
    </div>
  );
}
