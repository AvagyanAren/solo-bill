import { NextResponse } from "next/server";

import { ownedInvoiceWhere } from "@/lib/billing/authorization";
import { getInvoiceStatusDisplay, type BillingInvoiceStatus } from "@/lib/billing/lifecycle";
import { prisma } from "@/lib/db";
import { renderInvoicePdf } from "@/lib/pdf/invoice-pdf";
import { requireSession } from "@/lib/require-session";

type RouteContext = { params: Promise<{ id: string }> };

// #region agent log
fetch("http://127.0.0.1:7318/ingest/59523aca-1b99-4b99-a7c5-67eb14821bc1", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4b89a7" },
  body: JSON.stringify({
    sessionId: "4b89a7",
    runId: "vercel-build-repro",
    hypothesisId: "C",
    location: "app/api/invoices/[id]/pdf/route.ts:module",
    message: "pdf route module loaded (imports prisma)",
    data: {
      vercel: Boolean(process.env.VERCEL),
      phase: process.env.NEXT_PHASE ?? null,
    },
    timestamp: Date.now(),
  }),
}).catch(() => {});
// #endregion

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();
  const { id } = await context.params;

  const invoice = await prisma.invoice.findFirst({
    where: ownedInvoiceWhere(session.userId, { id }),
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      user: { include: { businessProfile: true } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  const profile = invoice.user.businessProfile;
  const statusLabel = getInvoiceStatusDisplay(
    invoice.status as BillingInvoiceStatus,
    invoice.dueDate,
  );

  const pdf = await renderInvoicePdf({
    invoiceNumber: invoice.invoiceNumber,
    title: invoice.title,
    description: invoice.description,
    status: statusLabel,
    currency: invoice.currency,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    notes: invoice.notes,
    terms: invoice.terms,
    subtotalMinor: invoice.subtotalMinor,
    taxMinor: invoice.taxMinor,
    discountMinor: invoice.discountMinor,
    totalMinor: invoice.totalMinor,
    business: {
      displayName: profile?.displayName,
      legalName: profile?.legalName,
      email: profile?.email ?? session.email,
      phone: profile?.phone,
      addressLine1: profile?.addressLine1,
      addressLine2: profile?.addressLine2,
      city: profile?.city,
      state: profile?.state,
      postalCode: profile?.postalCode,
      countryCode: profile?.countryCode,
    },
    client: {
      name: invoice.client.name,
      companyName: invoice.client.companyName,
      contactName: invoice.client.contactName,
      email: invoice.client.email,
      billingAddress1: invoice.client.billingAddress1,
      billingAddress2: invoice.client.billingAddress2,
      billingCity: invoice.client.billingCity,
      billingState: invoice.client.billingState,
      billingPostalCode: invoice.client.billingPostalCode,
      billingCountry: invoice.client.billingCountry,
    },
    lineItems: invoice.lineItems.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitAmountMinor: item.unitAmountMinor,
      taxRateBps: item.taxRateBps,
      taxMinor: item.taxMinor,
      totalMinor: item.totalMinor,
    })),
  });

  await prisma.invoiceActivity.create({
    data: {
      invoiceId: invoice.id,
      actorUserId: session.userId,
      type: "pdf_generated",
      metadataJson: JSON.stringify({
        bytes: pdf.byteLength,
        invoiceNumber: invoice.invoiceNumber,
      }),
    },
  });

  const filename = `${invoice.invoiceNumber.replace(/[^\w.-]+/g, "_")}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
