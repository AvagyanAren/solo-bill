import { Badge } from "@/components/ui/badge";
import {
  getInvoiceStatusDisplay,
  invoiceStatusLabel,
  type InvoiceStatusValue,
} from "@/lib/invoice-status";

type InvoiceStatusBadgeProps = {
  status: InvoiceStatusValue;
  dueDate: Date;
};

export function InvoiceStatusBadge({ status, dueDate }: InvoiceStatusBadgeProps) {
  const display = getInvoiceStatusDisplay(status, dueDate);
  const variant =
    display === "paid"
      ? "paid"
      : display === "overdue"
        ? "overdue"
        : display === "draft" || display === "void"
          ? "secondary"
          : "unpaid";

  return <Badge variant={variant}>{invoiceStatusLabel(display)}</Badge>;
}
