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
