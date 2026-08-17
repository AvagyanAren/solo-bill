export const BASIS_POINTS_SCALE = 10_000;

export type TaxableLineInput = {
  quantity: number;
  unitAmountMinor: number;
  taxRateBps?: number;
};

export type LineTotals = {
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
};

export type InvoiceTotals = LineTotals & {
  discountMinor: number;
};

function assertSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${name} must be a safe integer.`);
  }
}

function assertNonNegativeInteger(value: number, name: string): void {
  assertSafeInteger(value, name);
  if (value < 0) {
    throw new RangeError(`${name} cannot be negative.`);
  }
}

export function currencyFractionDigits(currency: string): number {
  const normalized = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new RangeError("Currency must be a three-letter ISO 4217 code.");
  }

  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: normalized,
  }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function majorToMinor(amount: number, currency = "USD"): number {
  if (!Number.isFinite(amount)) {
    throw new RangeError("Amount must be finite.");
  }
  const scale = 10 ** currencyFractionDigits(currency);
  const minor = Math.round((amount + Number.EPSILON) * scale);
  assertSafeInteger(minor, "Converted amount");
  return minor;
}

export function minorToMajor(amountMinor: number, currency = "USD"): number {
  assertSafeInteger(amountMinor, "Minor-unit amount");
  return amountMinor / 10 ** currencyFractionDigits(currency);
}

export function calculateLineTotals(input: TaxableLineInput): LineTotals {
  assertNonNegativeInteger(input.quantity, "Quantity");
  assertSafeInteger(input.unitAmountMinor, "Unit amount");
  const taxRateBps = input.taxRateBps ?? 0;
  assertNonNegativeInteger(taxRateBps, "Tax rate");

  const subtotalMinor = input.quantity * input.unitAmountMinor;
  assertSafeInteger(subtotalMinor, "Line subtotal");
  const taxMinor = Math.round((subtotalMinor * taxRateBps) / BASIS_POINTS_SCALE);
  assertSafeInteger(taxMinor, "Line tax");
  const totalMinor = subtotalMinor + taxMinor;
  assertSafeInteger(totalMinor, "Line total");

  return { subtotalMinor, taxMinor, totalMinor };
}

export function calculateInvoiceTotals(
  lines: readonly LineTotals[],
  discountMinor = 0,
): InvoiceTotals {
  assertNonNegativeInteger(discountMinor, "Discount");
  const subtotalMinor = lines.reduce((sum, line) => sum + line.subtotalMinor, 0);
  const taxMinor = lines.reduce((sum, line) => sum + line.taxMinor, 0);
  assertSafeInteger(subtotalMinor, "Invoice subtotal");
  assertSafeInteger(taxMinor, "Invoice tax");
  const beforeDiscount = subtotalMinor + taxMinor;
  if (discountMinor > beforeDiscount) {
    throw new RangeError("Discount cannot exceed the invoice amount.");
  }

  return {
    subtotalMinor,
    taxMinor,
    discountMinor,
    totalMinor: beforeDiscount - discountMinor,
  };
}
