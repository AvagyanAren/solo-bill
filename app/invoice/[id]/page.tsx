import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteInvoiceButton } from "@/components/delete-invoice-button";
import { DuplicateInvoiceButton } from "@/components/duplicate-invoice-button";
import { InvoiceDeliveryActions } from "@/components/invoice-delivery-actions";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { InvoiceStatusToggle } from "@/components/invoice-status-toggle";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ownedInvoiceWhere } from "@/lib/billing/authorization";
import {
  isReminderEligible,
  isSendInvoiceEligible,
  type BillingInvoiceStatus,
} from "@/lib/billing/lifecycle";
import { composeInvoiceEmail } from "@/lib/email/compose";
import { basisPointsToPercentage } from "@/lib/billing/tax";
import { minorToMajor } from "@/lib/billing/money";
import { prisma } from "@/lib/db";
import { formatDate, formatMinorMoney, formatMoney } from "@/lib/format";
import { cx } from "@/lib/utils/cx";
import { requireSession } from "@/lib/require-session";

type ActivityMetadata = {
  recipient?: string;
  subject?: string;
  failureReason?: string;
  mock?: boolean;
};

function parseActivityMetadata(json: string | null): ActivityMetadata | null {
  if (!json) {
    return null;
  }
  try {
    const data = JSON.parse(json) as unknown;
    if (!data || typeof data !== "object") {
      return null;
    }
    const row = data as Record<string, unknown>;
    return {
      recipient: typeof row.recipient === "string" ? row.recipient : undefined,
      subject: typeof row.subject === "string" ? row.subject : undefined,
      failureReason: typeof row.failureReason === "string" ? row.failureReason : undefined,
      mock: typeof row.mock === "boolean" ? row.mock : undefined,
    };
  } catch {
    return null;
  }
}

type LegacyLineItem = { name: string; price: number };

function parseLegacyLineItems(json: string): LegacyLineItem[] {
  try {
    const data = JSON.parse(json) as unknown;
    if (!Array.isArray(data)) {
      return [];
    }
    return data
      .map((row) => {
        if (!row || typeof row !== "object") {
          return null;
        }
        const name = "name" in row && typeof row.name === "string" ? row.name : "";
        const price = "price" in row && typeof row.price === "number" ? row.price : Number.NaN;
        if (!name || !Number.isFinite(price)) {
          return null;
        }
        return { name, price };
      })
      .filter((x): x is LegacyLineItem => x !== null);
  } catch {
    return [];
  }
}

type Props = { params: Promise<{ id: string }> };

export default async function InvoiceDetailPage({ params }: Props) {
  const session = await requireSession();
  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: ownedInvoiceWhere(session.userId, { id }),
    include: {
      client: true,
      lineItems: { orderBy: { sortOrder: "asc" } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 24,
        include: { actor: { select: { email: true } } },
      },
      reminderRuns: {
        orderBy: { createdAt: "desc" },
        take: 12,
      },
      user: {
        include: {
          businessProfile: true,
        },
      },
    },
  });
  if (!invoice) {
    notFound();
  }

  const profile = invoice.user.businessProfile;
  const normalizedLines = invoice.lineItems.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitAmountMinor: item.unitAmountMinor,
    taxRateBps: item.taxRateBps,
    taxMinor: item.taxMinor,
    totalMinor: item.totalMinor,
  }));
  const legacyLines =
    normalizedLines.length === 0 ? parseLegacyLineItems(invoice.lineItemsJson) : [];

  const businessName =
    profile?.displayName || profile?.legalName || session.email || "Your business";
  const billingStatus = invoice.status as BillingInvoiceStatus;
  const clientName = invoice.client.contactName || invoice.client.name;
  const invoiceEmail = composeInvoiceEmail({
    kind: "invoice",
    invoiceNumber: invoice.invoiceNumber,
    title: invoice.title,
    totalMinor: invoice.totalMinor,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    businessName,
    clientName,
  });
  const reminderEmail = composeInvoiceEmail({
    kind: "reminder",
    invoiceNumber: invoice.invoiceNumber,
    title: invoice.title,
    totalMinor: invoice.totalMinor,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    businessName,
    clientName,
    customSubject: profile?.reminderSubject ?? undefined,
    customBody: profile?.reminderBody ?? undefined,
  });

  return (
    <PageShell
      title={invoice.title || "Invoice"}
      description={invoice.invoiceNumber}
      lead={
        <Link
          href="/dashboard/invoices"
          className={cx(buttonVariants({ variant: "ghost", size: "sm" }), "min-h-11")}
        >
          ← Back to invoices
        </Link>
      }
      actions={
        <>
          <InvoiceStatusBadge status={invoice.status} dueDate={invoice.dueDate} />
          <InvoiceStatusToggle invoiceId={invoice.id} status={invoice.status} size="sm" />
          <InvoiceDeliveryActions
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
            defaultRecipient={invoice.client.email}
            defaultInvoiceSubject={invoiceEmail.subject}
            defaultInvoiceBody={invoiceEmail.bodyText}
            defaultReminderSubject={reminderEmail.subject}
            defaultReminderBody={reminderEmail.bodyText}
            canSend={isSendInvoiceEligible(billingStatus)}
            canRemind={isReminderEligible(billingStatus, invoice.dueDate)}
          />
          <Link
            href={`/invoice/${invoice.id}/edit`}
            className={cx(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
          >
            Edit
          </Link>
          <DuplicateInvoiceButton invoiceId={invoice.id} />
          <DeleteInvoiceButton
            invoiceId={invoice.id}
            invoiceLabel={invoice.title || invoice.invoiceNumber}
          />
        </>
      }
      contentClassName="mt-6 space-y-8"
    >
      <section className="grid gap-6 rounded-xl border border-secondary p-4 sm:grid-cols-2 sm:p-6">
        <div>
          <h2 className="text-sm font-semibold text-primary">From</h2>
          <p className="mt-2 font-medium text-primary">{businessName}</p>
          {profile?.email ? <p className="text-sm text-tertiary">{profile.email}</p> : null}
          {profile?.phone ? <p className="text-sm text-tertiary">{profile.phone}</p> : null}
          <address className="mt-2 text-sm not-italic text-tertiary">
            {[profile?.addressLine1, profile?.addressLine2, profile?.city, profile?.state, profile?.postalCode, profile?.countryCode]
              .filter(Boolean)
              .join(", ")}
          </address>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-primary">Bill to</h2>
          <p className="mt-2 font-medium text-primary">
            {invoice.client.companyName || invoice.client.name}
          </p>
          {invoice.client.contactName ? (
            <p className="text-sm text-tertiary">{invoice.client.contactName}</p>
          ) : null}
          <p className="text-sm text-tertiary">{invoice.client.email}</p>
          <address className="mt-2 text-sm not-italic text-tertiary">
            {[
              invoice.client.billingAddress1,
              invoice.client.billingAddress2,
              invoice.client.billingCity,
              invoice.client.billingState,
              invoice.client.billingPostalCode,
              invoice.client.billingCountry,
            ]
              .filter(Boolean)
              .join(", ")}
          </address>
        </div>
      </section>

      <dl className="grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-tertiary">Issue date</dt>
          <dd className="font-medium text-primary">{formatDate(invoice.issueDate)}</dd>
        </div>
        <div>
          <dt className="text-tertiary">Due date</dt>
          <dd className="font-medium text-primary">{formatDate(invoice.dueDate)}</dd>
        </div>
        <div>
          <dt className="text-tertiary">Status</dt>
          <dd className="mt-1">
            <InvoiceStatusBadge status={invoice.status} dueDate={invoice.dueDate} />
          </dd>
        </div>
        <div className="sm:col-span-3">
          <dt className="text-tertiary">Work description</dt>
          <dd className="mt-1 whitespace-pre-wrap text-primary">{invoice.description}</dd>
        </div>
      </dl>

      {normalizedLines.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-secondary">
          <Table>
            <TableCaption className="sr-only">Invoice line items</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Unit</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {normalizedLines.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.description}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinorMoney(row.unitAmountMinor, invoice.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {basisPointsToPercentage(row.taxRateBps)}%
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinorMoney(row.totalMinor, invoice.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : legacyLines.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-secondary">
          <Table>
            <TableCaption className="sr-only">Invoice line items</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {legacyLines.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(row.price)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : null}

      <dl className="ml-auto grid w-full gap-2 rounded-xl border border-secondary p-4 text-sm sm:max-w-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-tertiary">Subtotal</dt>
          <dd className="tabular-nums text-primary">
            {formatMinorMoney(invoice.subtotalMinor, invoice.currency)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-tertiary">Tax</dt>
          <dd className="tabular-nums text-primary">
            {formatMinorMoney(invoice.taxMinor, invoice.currency)}
          </dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-tertiary">Discount</dt>
          <dd className="tabular-nums text-primary">
            −{formatMinorMoney(invoice.discountMinor, invoice.currency)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-secondary pt-2 font-semibold">
          <dt className="text-primary">Total</dt>
          <dd className="tabular-nums text-primary">
            {formatMinorMoney(invoice.totalMinor, invoice.currency)}
          </dd>
        </div>
        {legacyLines.length > 0 && normalizedLines.length === 0 ? (
          <div className="flex justify-between gap-4 text-tertiary">
            <dt>Legacy total</dt>
            <dd className="tabular-nums">
              {formatMoney(minorToMajor(invoice.totalMinor, invoice.currency))}
            </dd>
          </div>
        ) : null}
      </dl>

      {(invoice.notes || invoice.terms || invoice.internalNotes) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {invoice.notes ? (
            <div>
              <h2 className="text-sm font-semibold text-primary">Customer notes</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-tertiary">{invoice.notes}</p>
            </div>
          ) : null}
          {invoice.terms ? (
            <div>
              <h2 className="text-sm font-semibold text-primary">Terms</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-tertiary">{invoice.terms}</p>
            </div>
          ) : null}
          {invoice.internalNotes ? (
            <div className="sm:col-span-2">
              <h2 className="text-sm font-semibold text-primary">Internal notes</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-tertiary">{invoice.internalNotes}</p>
            </div>
          ) : null}
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-primary">Activity &amp; outbox</h2>
        <p className="mt-1 text-sm text-tertiary">
          Email sends, reminders, and PDF downloads appear here (including mock outbox
          delivery).
        </p>
        {invoice.activities.length === 0 ? (
          <p className="mt-2 text-sm text-tertiary">No activity recorded yet.</p>
        ) : (
          <ol className="mt-3 space-y-3 border-l border-secondary pl-4">
            {invoice.activities.map((activity) => {
              const meta = parseActivityMetadata(activity.metadataJson);
              return (
                <li key={activity.id} className="text-sm">
                  <p className="font-medium text-primary">
                    {activity.type.replaceAll("_", " ")}
                    {activity.previousStatus && activity.nextStatus
                      ? `: ${activity.previousStatus} → ${activity.nextStatus}`
                      : activity.nextStatus
                        ? `: ${activity.nextStatus}`
                        : ""}
                  </p>
                  {meta?.recipient || meta?.subject ? (
                    <p className="text-tertiary">
                      {meta.recipient ? `To ${meta.recipient}` : null}
                      {meta.recipient && meta.subject ? " · " : null}
                      {meta.subject ? meta.subject : null}
                      {meta.mock ? " · mock" : null}
                    </p>
                  ) : null}
                  {meta?.failureReason ? (
                    <p className="text-error-primary">{meta.failureReason}</p>
                  ) : null}
                  <p className="text-tertiary">
                    {formatDate(activity.createdAt)}
                    {activity.actor?.email ? ` · ${activity.actor.email}` : ""}
                  </p>
                </li>
              );
            })}
          </ol>
        )}

        {invoice.reminderRuns.length > 0 ? (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-primary">Email outbox</h3>
            <ul className="mt-3 divide-y divide-secondary rounded-xl border border-secondary">
              {invoice.reminderRuns.map((run) => (
                <li key={run.id} className="px-4 py-3 text-sm">
                  <p className="font-medium text-primary">
                    {run.kind} · {run.status}
                    {run.channel ? ` · ${run.channel}` : ""}
                  </p>
                  <p className="text-tertiary">
                    To {run.recipient} · {run.subject}
                  </p>
                  <p className="text-tertiary">
                    {run.sentAt
                      ? `Sent ${formatDate(run.sentAt)}`
                      : run.failedAt
                        ? `Failed ${formatDate(run.failedAt)}`
                        : `Queued ${formatDate(run.createdAt)}`}
                  </p>
                  {run.failureReason ? (
                    <p className="text-error-primary">{run.failureReason}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </PageShell>
  );
}
