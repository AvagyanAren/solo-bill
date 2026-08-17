import { BusinessSettingsForm } from "@/components/business-settings-form";
import { InvoiceStatusBadge } from "@/components/invoice-status-badge";
import { PageShell } from "@/components/page-shell";
import { ownedReminderRunWhere } from "@/lib/billing/authorization";
import { basisPointsToPercentage } from "@/lib/billing/tax";
import { formatDate, formatMinorMoney } from "@/lib/format";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";

function taxPercentFromBps(bps: number): number {
  try {
    return basisPointsToPercentage(bps);
  } catch {
    return 0;
  }
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function SettingsPage() {
  const session = await requireSession();

  const [profile, reminderRuns] = await Promise.all([
    prisma.businessProfile.findUnique({ where: { userId: session.userId } }),
    prisma.reminderRun.findMany({
      where: ownedReminderRunWhere(session.userId),
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            title: true,
            status: true,
            dueDate: true,
            totalMinor: true,
            currency: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ]);

  const defaults = {
    legalName: profile?.legalName ?? "",
    displayName: profile?.displayName ?? "",
    email: profile?.email ?? session.email,
    phone: profile?.phone ?? "",
    addressLine1: profile?.addressLine1 ?? "",
    addressLine2: profile?.addressLine2 ?? "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
    postalCode: profile?.postalCode ?? "",
    countryCode: profile?.countryCode ?? "",
    defaultCurrency: profile?.defaultCurrency ?? "USD",
    locale: profile?.locale ?? "en-US",
    defaultTaxRatePercent: taxPercentFromBps(profile?.defaultTaxRateBps ?? 0),
    defaultPaymentTermsDays: profile?.defaultPaymentTermsDays ?? 30,
    invoicePrefix: profile?.invoicePrefix ?? "INV",
    nextInvoiceSequence: profile?.nextInvoiceSequence ?? 1,
    remindersEnabled: profile?.remindersEnabled ?? false,
    reminderDaysAfterDue: profile?.reminderDaysAfterDue ?? 7,
    reminderSubject: profile?.reminderSubject ?? "",
    reminderBody: profile?.reminderBody ?? "",
  };

  return (
    <PageShell
      title="Settings"
      description="Business profile, invoice defaults, and mock reminder diagnostics."
      contentClassName="mt-8 space-y-10"
    >
      <BusinessSettingsForm defaults={defaults} />

      <section className="space-y-4" aria-labelledby="outbox-heading">
        <div>
          <h2 id="outbox-heading" className="text-base font-semibold text-primary">
            Mock email outbox
          </h2>
          <p className="mt-1 text-sm text-tertiary">
            Recent ReminderRun records from send/remind actions. Delivery uses the local mock
            adapter — nothing is sent to an external provider.
          </p>
        </div>

        {reminderRuns.length === 0 ? (
          <div className="rounded-xl border border-dashed border-secondary bg-secondary/30 p-8 text-center">
            <p className="text-sm text-tertiary">
              No mock emails yet. Send an invoice or reminder to populate this outbox.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl ring-1 ring-secondary ring-inset">
            <ul className="divide-y divide-secondary">
              {reminderRuns.map((run) => (
                <li
                  key={run.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium text-primary">{run.subject}</p>
                    <p className="text-sm text-tertiary">
                      To {run.recipient} · {run.kind === "reminder" ? "Reminder" : "Invoice"} ·{" "}
                      {run.invoice.invoiceNumber}
                    </p>
                    <p className="text-xs text-tertiary">
                      Created {formatDate(run.createdAt)}
                      {run.sentAt ? ` · Sent ${formatDate(run.sentAt)}` : null}
                      {run.failedAt ? ` · Failed ${formatDate(run.failedAt)}` : null}
                      {run.providerMessageId ? ` · ${run.providerMessageId}` : null}
                    </p>
                    {run.failureReason ? (
                      <p className="text-sm text-error-primary" role="status">
                        {run.failureReason}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary">
                      {statusLabel(run.status)}
                    </span>
                    <InvoiceStatusBadge
                      status={run.invoice.status}
                      dueDate={run.invoice.dueDate}
                    />
                    <span className="text-sm tabular-nums text-primary">
                      {formatMinorMoney(run.invoice.totalMinor, run.invoice.currency)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </PageShell>
  );
}
