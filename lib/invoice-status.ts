import {
  getInvoiceStatusDisplay as getBillingInvoiceStatusDisplay,
  type BillingInvoiceStatus,
  type InvoiceStatusDisplay,
} from "@/lib/billing/lifecycle";

export type InvoiceStatusValue = BillingInvoiceStatus;
export type { InvoiceStatusDisplay };

export function getInvoiceStatusDisplay(
  status: InvoiceStatusValue,
  dueDate: Date,
  now: Date = new Date(),
): InvoiceStatusDisplay {
  return getBillingInvoiceStatusDisplay(status, dueDate, now);
}

export function invoiceStatusLabel(display: InvoiceStatusDisplay): string {
  switch (display) {
    case "paid":
      return "Paid";
    case "overdue":
      return "Overdue";
    case "draft":
      return "Draft";
    case "sent":
      return "Sent";
    case "unpaid":
      return "Unpaid";
    case "void":
      return "Void";
  }
}
