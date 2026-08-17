import Link from "next/link";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  CurrencyDollar,
  Users01,
} from "@untitledui/icons";

import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { PageShell } from "@/components/page-shell";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ownedInvoiceWhere } from "@/lib/billing/authorization";
import {
  daysPastDue,
  isInvoiceOverdue,
  isOpenInvoiceStatus,
  type BillingInvoiceStatus,
} from "@/lib/billing/lifecycle";
import { formatDate, formatMinorMoney } from "@/lib/format";
import { prisma } from "@/lib/db";
import { cx } from "@/lib/utils/cx";
import { requireSession } from "@/lib/require-session";

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

type KpiCardProps = {
  href: string;
  title: string;
  description: string;
  value: string;
  icon: typeof CurrencyDollar;
  color: "brand" | "error" | "success" | "warning" | "gray";
  accentClassName: string;
};

function KpiCard({
  href,
  title,
  description,
  value,
  icon,
  color,
  accentClassName,
}: KpiCardProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand"
      aria-label={`${title}: ${value}. ${description}`}
    >
      <Card
        className={cx(
          "h-full border-l-4 transition-colors hover:bg-secondary/30",
          accentClassName,
        )}
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <FeaturedIcon icon={icon} color={color} theme="light" size="md" />
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums text-primary">{value}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function DashboardPage() {
  const session = await requireSession();
  const now = new Date();
  const inSevenDays = addDays(now, 7);
  const owned = ownedInvoiceWhere(session.userId);

  // Two Turso round-trips instead of ten parallel aggregates (each still pays libSQL latency).
  const [clientCount, invoices] = await Promise.all([
    prisma.client.count({ where: { userId: session.userId } }),
    prisma.invoice.findMany({
      where: owned,
      select: {
        id: true,
        title: true,
        invoiceNumber: true,
        status: true,
        dueDate: true,
        totalMinor: true,
        currency: true,
        createdAt: true,
        client: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  let unpaidCount = 0;
  let unpaidAmountMinor = 0;
  let paidCount = 0;
  let paidAmountMinor = 0;
  let overdueCount = 0;
  let overdueAmountMinor = 0;
  let aging0Count = 0;
  let aging0Amount = 0;
  let aging31Count = 0;
  let aging31Amount = 0;
  let aging61Count = 0;
  let aging61Amount = 0;
  const upcomingDue: typeof invoices = [];

  for (const inv of invoices) {
    const status = inv.status as BillingInvoiceStatus;

    if (status === "unpaid") {
      unpaidCount += 1;
      unpaidAmountMinor += inv.totalMinor;
    } else if (status === "paid") {
      paidCount += 1;
      paidAmountMinor += inv.totalMinor;
    }

    if (isInvoiceOverdue(status, inv.dueDate, now)) {
      overdueCount += 1;
      overdueAmountMinor += inv.totalMinor;
      const days = daysPastDue(inv.dueDate, now);
      if (days <= 30) {
        aging0Count += 1;
        aging0Amount += inv.totalMinor;
      } else if (days <= 60) {
        aging31Count += 1;
        aging31Amount += inv.totalMinor;
      } else {
        aging61Count += 1;
        aging61Amount += inv.totalMinor;
      }
      continue;
    }

    if (isOpenInvoiceStatus(status) && !isInvoiceOverdue(status, inv.dueDate, now) && inv.dueDate < inSevenDays) {
      upcomingDue.push(inv);
    }
  }

  upcomingDue.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  const upcomingDueLimited = upcomingDue.slice(0, 5);
  const recentInvoices = invoices.slice(0, 5);
  const outstandingAmountMinor = unpaidAmountMinor;

  return (
    <PageShell
      title="Dashboard"
      description={
        <p>
          Signed in as <span className="font-medium text-primary">{session.email}</span>
        </p>
      }
      actions={
        <Link href="/invoice/new" className={cx(buttonVariants(), "min-h-11 shrink-0")}>
          New invoice
        </Link>
      }
      contentClassName="mt-8 space-y-8"
    >
      <section aria-label="Key billing metrics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            href="/dashboard/invoices?status=unpaid"
            title="Outstanding"
            description={`${unpaidCount} unpaid invoice${unpaidCount === 1 ? "" : "s"}`}
            value={formatMinorMoney(outstandingAmountMinor)}
            icon={CurrencyDollar}
            color="brand"
            accentClassName="border-l-fg-brand-primary"
          />
          <KpiCard
            href="/dashboard/invoices?overdue=1"
            title="Overdue"
            description={
              overdueCount
                ? `${formatMinorMoney(overdueAmountMinor)} past due`
                : "Past due and unpaid"
            }
            value={String(overdueCount)}
            icon={AlertCircle}
            color="error"
            accentClassName="border-l-fg-error-primary"
          />
          <KpiCard
            href="/dashboard/invoices?status=paid"
            title="Collected"
            description={`${paidCount} paid invoice${paidCount === 1 ? "" : "s"}`}
            value={formatMinorMoney(paidAmountMinor)}
            icon={CheckCircle}
            color="success"
            accentClassName="border-l-fg-success-primary"
          />
          <KpiCard
            href="/dashboard/clients"
            title="Clients"
            description="People and companies you bill"
            value={String(clientCount)}
            icon={Users01}
            color="gray"
            accentClassName="border-l-fg-secondary"
          />
        </div>
      </section>

      <section
        className="grid gap-4 lg:grid-cols-2"
        aria-label="Aging and upcoming due summaries"
      >
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Aging summary</CardTitle>
                <CardDescription>Open invoices by days past due</CardDescription>
              </div>
              <FeaturedIcon icon={Clock} color="warning" theme="light" size="md" />
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-center justify-between gap-3 text-sm">
                <span className="text-tertiary">1–30 days</span>
                <span className="tabular-nums text-primary">
                  {aging0Count} · {formatMinorMoney(aging0Amount)}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 text-sm">
                <span className="text-tertiary">31–60 days</span>
                <span className="tabular-nums text-primary">
                  {aging31Count} · {formatMinorMoney(aging31Amount)}
                </span>
              </li>
              <li className="flex items-center justify-between gap-3 text-sm">
                <span className="text-tertiary">61+ days</span>
                <span className="tabular-nums text-primary">
                  {aging61Count} · {formatMinorMoney(aging61Amount)}
                </span>
              </li>
            </ul>
            <Link
              href="/dashboard/invoices?overdue=1"
              className={cx(buttonVariants({ variant: "link" }), "mt-4 h-auto min-h-11 px-0")}
            >
              View overdue invoices
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Upcoming due</CardTitle>
                <CardDescription>Open invoices due in the next 7 days</CardDescription>
              </div>
              <FeaturedIcon icon={Clock} color="brand" theme="light" size="md" />
            </div>
          </CardHeader>
          <CardContent>
            {upcomingDueLimited.length === 0 ? (
              <p className="text-sm text-tertiary">Nothing due in the next week.</p>
            ) : (
              <ul className="divide-y divide-secondary">
                {upcomingDueLimited.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-primary">
                        {inv.invoiceNumber}
                      </p>
                      <p className="truncate text-xs text-tertiary">
                        {inv.client.name} · due {formatDate(inv.dueDate)}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-primary">
                      {formatMinorMoney(inv.totalMinor, inv.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/dashboard/invoices?status=unpaid"
              className={cx(buttonVariants({ variant: "link" }), "mt-4 h-auto min-h-11 px-0")}
            >
              View unpaid invoices
            </Link>
          </CardContent>
        </Card>
      </section>

      <div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-primary">Recent invoices</h2>
            <p className="text-sm text-tertiary">Your latest billing activity</p>
          </div>
          <Link
            href="/dashboard/invoices"
            className={cx(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11 shrink-0")}
          >
            View all
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-secondary bg-secondary p-8 text-center">
            <p className="text-sm text-tertiary">No invoices yet.</p>
            <Link href="/invoice/new" className={cx(buttonVariants({ variant: "link" }), "mt-2")}>
              Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-secondary ring-inset">
            <ul className="divide-y divide-secondary">
              {recentInvoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-primary">
                      {inv.title || inv.invoiceNumber || "Untitled invoice"}
                    </p>
                    <p className="text-sm text-tertiary">{inv.client.name}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <InvoiceStatusBadge status={inv.status} dueDate={inv.dueDate} />
                    <span className="text-sm font-medium tabular-nums text-primary">
                      {formatMinorMoney(inv.totalMinor, inv.currency)}
                    </span>
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
          </div>
        )}
      </div>
    </PageShell>
  );
}
