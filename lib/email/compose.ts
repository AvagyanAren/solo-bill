import { formatDate, formatMinorMoney } from "@/lib/format";

export type ComposeInvoiceEmailInput = {
  kind: "invoice" | "reminder";
  invoiceNumber: string;
  title: string;
  totalMinor: number;
  currency: string;
  dueDate: Date;
  businessName: string;
  clientName: string;
  customSubject?: string;
  customBody?: string;
};

export function defaultInvoiceSubject(input: ComposeInvoiceEmailInput): string {
  if (input.kind === "reminder") {
    return `Reminder: Invoice ${input.invoiceNumber} is due`;
  }
  return `Invoice ${input.invoiceNumber} from ${input.businessName}`;
}

export function defaultInvoiceBody(input: ComposeInvoiceEmailInput): string {
  const total = formatMinorMoney(input.totalMinor, input.currency);
  const due = formatDate(input.dueDate);
  const heading =
    input.kind === "reminder"
      ? `This is a friendly reminder that invoice ${input.invoiceNumber} is unpaid.`
      : `Please find invoice ${input.invoiceNumber} below.`;

  return [
    `Hi ${input.clientName},`,
    "",
    heading,
    "",
    `Title: ${input.title || "Invoice"}`,
    `Amount due: ${total}`,
    `Due date: ${due}`,
    "",
    `Thank you,`,
    input.businessName,
    "",
    "(Delivered via SoloBill local mock outbox — no external email was sent.)",
  ].join("\n");
}

export function composeInvoiceEmail(input: ComposeInvoiceEmailInput): {
  subject: string;
  bodyText: string;
} {
  const subject = input.customSubject?.trim() || defaultInvoiceSubject(input);
  const bodyText = input.customBody?.trim() || defaultInvoiceBody(input);
  return { subject, bodyText };
}
