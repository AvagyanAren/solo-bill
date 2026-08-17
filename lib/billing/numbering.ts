export type InvoiceNumberInput = {
  prefix: string;
  sequence: number;
  issueDate: Date;
  padding?: number;
};

export function normalizeInvoicePrefix(prefix: string): string {
  const normalized = prefix
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new RangeError("Invoice prefix must contain a letter or number.");
  }
  return normalized;
}

export function formatInvoiceNumber({
  prefix,
  sequence,
  issueDate,
  padding = 4,
}: InvoiceNumberInput): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1) {
    throw new RangeError("Invoice sequence must be a positive safe integer.");
  }
  if (!Number.isSafeInteger(padding) || padding < 1 || padding > 12) {
    throw new RangeError("Invoice number padding must be between 1 and 12.");
  }
  if (Number.isNaN(issueDate.getTime())) {
    throw new RangeError("Issue date must be valid.");
  }

  const year = issueDate.getUTCFullYear();
  return `${normalizeInvoicePrefix(prefix)}-${year}-${String(sequence).padStart(padding, "0")}`;
}
