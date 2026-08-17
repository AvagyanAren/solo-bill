export const INVOICE_STATUSES = ["draft", "sent", "unpaid", "paid", "void"] as const;

export type BillingInvoiceStatus = (typeof INVOICE_STATUSES)[number];
export type InvoiceStatusDisplay = BillingInvoiceStatus | "overdue";

const ALLOWED_TRANSITIONS: Record<BillingInvoiceStatus, readonly BillingInvoiceStatus[]> = {
  draft: ["sent", "unpaid", "void"],
  sent: ["unpaid", "paid", "void"],
  unpaid: ["sent", "paid", "void"],
  paid: ["unpaid", "void"],
  void: [],
};

export function canTransitionInvoice(
  from: BillingInvoiceStatus,
  to: BillingInvoiceStatus,
): boolean {
  return from === to || ALLOWED_TRANSITIONS[from].includes(to);
}

export function assertInvoiceTransition(
  from: BillingInvoiceStatus,
  to: BillingInvoiceStatus,
): void {
  if (!canTransitionInvoice(from, to)) {
    throw new Error(`Invoice cannot transition from ${from} to ${to}.`);
  }
}

export function lifecycleTimestamps(
  from: BillingInvoiceStatus,
  to: BillingInvoiceStatus,
  at: Date = new Date(),
): { sentAt?: Date | null; paidAt?: Date | null; voidedAt?: Date | null } {
  assertInvoiceTransition(from, to);
  if (to === "sent") {
    return { sentAt: at, voidedAt: null };
  }
  if (to === "paid") {
    return { paidAt: at, voidedAt: null };
  }
  if (to === "void") {
    return { voidedAt: at };
  }
  if (from === "paid" && to === "unpaid") {
    return { paidAt: null };
  }
  return {};
}

export function getInvoiceStatusDisplay(
  status: BillingInvoiceStatus,
  dueDate: Date,
  now: Date = new Date(),
): InvoiceStatusDisplay {
  if ((status === "sent" || status === "unpaid") && isPastDueDate(dueDate, now)) {
    return "overdue";
  }
  return status;
}

export function isPastDueDate(dueDate: Date, now: Date = new Date()): boolean {
  const end = new Date(dueDate);
  end.setHours(23, 59, 59, 999);
  return end < now;
}

/** Open invoices that can become overdue (sent or unpaid). */
export const OPEN_INVOICE_STATUSES = ["unpaid", "sent"] as const satisfies readonly BillingInvoiceStatus[];

export type OpenInvoiceStatus = (typeof OPEN_INVOICE_STATUSES)[number];

export function isOpenInvoiceStatus(status: string): status is OpenInvoiceStatus {
  return (OPEN_INVOICE_STATUSES as readonly string[]).includes(status);
}

/**
 * Canonical overdue check — matches status badges.
 * An open invoice is overdue after the calendar due day has ended.
 */
export function isInvoiceOverdue(
  status: BillingInvoiceStatus,
  dueDate: Date,
  now: Date = new Date(),
): boolean {
  return isOpenInvoiceStatus(status) && isPastDueDate(dueDate, now);
}

/** Start of local day for `now` — Prisma overdue filter uses `dueDate < this`. */
export function overdueDueDateCutoff(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Prisma `dueDate` filter aligned with {@link isPastDueDate} when due dates are stored
 * at local midnight of the due day.
 */
export function prismaOverdueDueDateFilter(now: Date = new Date()): { lt: Date } {
  return { lt: overdueDueDateCutoff(now) };
}

/** Whole days past the due calendar day (0 if not yet overdue). */
export function daysPastDue(dueDate: Date, now: Date = new Date()): number {
  if (!isPastDueDate(dueDate, now)) {
    return 0;
  }
  const dueDay = new Date(dueDate);
  dueDay.setHours(0, 0, 0, 0);
  const today = overdueDueDateCutoff(now);
  return Math.floor((today.getTime() - dueDay.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * Manual reminders: unpaid invoices, or overdue (past-due sent/unpaid).
 * Draft, paid, and void are never eligible.
 */
export function isReminderEligible(
  status: BillingInvoiceStatus,
  dueDate: Date,
  now: Date = new Date(),
): boolean {
  if (status === "unpaid") {
    return true;
  }
  if (status === "sent") {
    return isPastDueDate(dueDate, now);
  }
  return false;
}

/** Send / resend invoice email for draft or open (sent/unpaid) invoices. */
export function isSendInvoiceEligible(status: BillingInvoiceStatus): boolean {
  return status === "draft" || status === "sent" || status === "unpaid";
}
