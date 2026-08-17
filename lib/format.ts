import { minorToMajor } from "@/lib/billing/money";

export function formatMoney(
  amount: number,
  currency = "USD",
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

export function formatMinorMoney(
  amountMinor: number,
  currency = "USD",
  locale?: string,
): string {
  return formatMoney(minorToMajor(amountMinor, currency), currency, locale);
}

export function formatDate(date: Date, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(date);
}
