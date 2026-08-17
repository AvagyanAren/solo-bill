import Link from "next/link";
import { Suspense } from "react";

import { InvoicesFilterBar } from "@/components/invoices-filter-bar";
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
  INVOICE_STATUSES,
  OPEN_INVOICE_STATUSES,
  prismaOverdueDueDateFilter,
  type BillingInvoiceStatus,
} from "@/lib/billing/lifecycle";
import { formatDate, formatMinorMoney } from "@/lib/format";
import { formatPeriodToolbarLabel, resolveInvoiceDateRange } from "@/lib/invoice-period";
import { prisma } from "@/lib/db";
import { cx } from "@/lib/utils/cx";
import { requireSession } from "@/lib/require-session";

type PageProps = {
  searchParams: Promise<{
    period?: string;
    from?: string;
    to?: string;
    anchor?: string;
    clientId?: string;
    status?: string;
    overdue?: string;
    q?: string;
  }>;
};

function isStatus(value: string | undefined): value is BillingInvoiceStatus {
  return INVOICE_STATUSES.includes(value as BillingInvoiceStatus);
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const params = await searchParams;
  const range = resolveInvoiceDateRange(params);
  const clientId = params.clientId?.trim() || null;
  const status = isStatus(params.status?.trim()) ? params.status.trim() : null;
  const overdue = params.overdue === "1" || params.overdue === "true";
  const query = params.q?.trim() || "";
  const now = new Date();

  const clients = await prisma.client.findMany({
    where: { userId: session.userId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  const clientFilter =
    clientId && clients.some((c) => c.id === clientId) ? { clientId } : {};

  const createdAtFilter =
    range.from || range.to
      ? {
          createdAt: {
            ...(range.from ? { gte: range.from } : {}),
            ...(range.to ? { lte: range.to } : {}),
          },
        }
      : {};

  const statusFilter = overdue
    ? {
        status: { in: [...OPEN_INVOICE_STATUSES] },
        dueDate: prismaOverdueDueDateFilter(now),
      }
    : status
      ? { status: status as BillingInvoiceStatus }
      : {};

  const searchFilter = query
    ? {
        OR: [
          { title: { contains: query } },
          { invoiceNumber: { contains: query } },
          { description: { contains: query } },
          { client: { name: { contains: query } } },
          { client: { email: { contains: query } } },
        ],
      }
    : {};

  const invoices = await prisma.invoice.findMany({
    where: {
      AND: [
        ownedInvoiceWhere(session.userId),
        clientFilter,
        createdAtFilter,
        statusFilter,
        searchFilter,
      ],
    },
    include: { client: true },
    orderBy: { createdAt: "desc" },
  });

  const periodSummary = formatPeriodToolbarLabel(range);
  const selectedClient = clientId ? clients.find((c) => c.id === clientId) : null;

  return (
    <PageShell
      title="Invoices"
      description="All invoices you have created"
      contentClassName="mt-6 space-y-8"
      actions={
        <Link href="/invoice/new" className={cx(buttonVariants(), "min-h-11")}>
          New invoice
        </Link>
      }
    >
      <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-secondary/50" />}>
        <InvoicesFilterBar
          clients={clients}
          range={range}
          clientId={clientId}
          status={status}
          overdue={overdue}
          query={query}
        />
      </Suspense>

      {invoices.length === 0 ? (
        <div className="rounded-xl border border-dashed border-secondary bg-secondary/30 p-8 text-center">
          <p className="text-sm text-tertiary">
            {range.preset === "all" && !selectedClient && !status && !overdue && !query
              ? "No invoices yet."
              : `No invoices match${selectedClient ? ` ${selectedClient.name}` : ""}${
                  status ? ` with status ${status}` : ""
                }${overdue ? " that are overdue" : ""}${
                  query ? ` for “${query}”` : ""
                }${range.preset !== "all" ? ` for ${periodSummary}` : ""}.`}
          </p>
          <Link href="/invoice/new" className={cx(buttonVariants({ variant: "link" }), "mt-2")}>
            Create an invoice
          </Link>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:hidden">
            {invoices.map((inv) => (
              <li
                key={inv.id}
                className="rounded-xl border border-secondary bg-primary p-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-primary">{inv.client.name}</p>
                    <p className="truncate text-sm text-tertiary">
                      {inv.title || inv.invoiceNumber || "—"}
                    </p>
                  </div>
                  <InvoiceStatusBadge status={inv.status} dueDate={inv.dueDate} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-tertiary">Amount</dt>
                    <dd className="font-medium tabular-nums text-primary">
                      {formatMinorMoney(inv.totalMinor, inv.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-tertiary">Created</dt>
                    <dd className="text-primary">{formatDate(inv.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-tertiary">Due</dt>
                    <dd className="text-primary">{formatDate(inv.dueDate)}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <InvoiceStatusToggle invoiceId={inv.id} status={inv.status} size="sm" />
                  <Link
                    href={`/invoice/${inv.id}`}
                    className={cx(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-xl border border-secondary sm:block">
            <Table>
              <TableCaption className="sr-only">List of invoices</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="w-[1%] text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.client.name}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-tertiary">
                      {inv.title || inv.invoiceNumber || "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMinorMoney(inv.totalMinor, inv.currency)}
                    </TableCell>
                    <TableCell>
                      <InvoiceStatusBadge status={inv.status} dueDate={inv.dueDate} />
                    </TableCell>
                    <TableCell className="text-tertiary">{formatDate(inv.createdAt)}</TableCell>
                    <TableCell className="text-tertiary">{formatDate(inv.dueDate)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <InvoiceStatusToggle invoiceId={inv.id} status={inv.status} size="sm" />
                        <Link
                          href={`/invoice/${inv.id}`}
                          className={cx(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
                        >
                          View
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </PageShell>
  );
}
