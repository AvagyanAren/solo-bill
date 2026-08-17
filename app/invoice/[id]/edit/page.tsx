import Link from "next/link";
import { notFound } from "next/navigation";

import { InvoiceEditor } from "@/components/invoice-editor";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button-variants";
import { ownedInvoiceWhere } from "@/lib/billing/authorization";
import { basisPointsToPercentage } from "@/lib/billing/tax";
import { minorToMajor } from "@/lib/billing/money";
import { prisma } from "@/lib/db";
import { cx } from "@/lib/utils/cx";
import { requireSession } from "@/lib/require-session";

function toUtcDateInputValue(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = { params: Promise<{ id: string }> };

export default async function EditInvoicePage({ params }: Props) {
  const session = await requireSession();
  const { id } = await params;

  const [invoice, clients, profile] = await Promise.all([
    prisma.invoice.findFirst({
      where: ownedInvoiceWhere(session.userId, { id }),
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
      },
    }),
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

  if (!invoice) {
    notFound();
  }

  if (clients.length === 0) {
    notFound();
  }

  const issue = new Date(invoice.issueDate);
  const due = new Date(invoice.dueDate);
  const termsDays = Math.max(
    0,
    Math.round((due.getTime() - issue.getTime()) / 86_400_000),
  );

  return (
    <PageShell
      title="Edit invoice"
      description={invoice.invoiceNumber}
      lead={
        <Link
          href={`/invoice/${invoice.id}`}
          className={cx(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-11")}
        >
          ← Back to invoice
        </Link>
      }
      contentClassName="mt-8"
    >
      <InvoiceEditor
        mode="edit"
        clients={clients}
        defaultPaymentTermsDays={profile?.defaultPaymentTermsDays ?? 14}
        defaultCurrency={profile?.defaultCurrency ?? "USD"}
        initial={{
          id: invoice.id,
          revision: invoice.revision,
          status: invoice.status,
          clientId: invoice.clientId,
          title: invoice.title,
          description: invoice.description,
          currency: invoice.currency,
          invoiceNumber: invoice.invoiceNumber,
          autoInvoiceNumber: false,
          issueDate: toUtcDateInputValue(issue),
          dueDate: toUtcDateInputValue(due),
          paymentTermsDays: Number.isFinite(termsDays) ? termsDays : 14,
          discountMajor: String(minorToMajor(invoice.discountMinor, invoice.currency)),
          notes: invoice.notes ?? "",
          terms: invoice.terms ?? "",
          internalNotes: invoice.internalNotes ?? "",
          lines:
            invoice.lineItems.length > 0
              ? invoice.lineItems.map((item) => ({
                  description: item.description,
                  quantity: String(item.quantity),
                  unitAmount: String(minorToMajor(item.unitAmountMinor, invoice.currency)),
                  taxRatePercent: String(basisPointsToPercentage(item.taxRateBps)),
                }))
              : undefined,
        }}
      />
    </PageShell>
  );
}
