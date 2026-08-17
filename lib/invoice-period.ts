import {
  endOfDay,
  parseDateInput,
  startOfDay,
} from "@/lib/billing/dates";

export type InvoicePeriodPreset = "week" | "custom" | "all";

export type InvoiceDateRange = {
  preset: InvoicePeriodPreset;
  from: Date | null;
  to: Date | null;
  fromInput: string;
  toInput: string;
  anchorInput: string;
};

const PRESETS: InvoicePeriodPreset[] = ["week", "custom", "all"];

export function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isPreset(value: string | undefined): value is InvoicePeriodPreset {
  return PRESETS.includes(value as InvoicePeriodPreset);
}

/** Monday-based week start (matches reference calendar). */
export function startOfWeekMonday(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export function endOfWeekSunday(weekStart: Date): Date {
  const x = new Date(weekStart);
  x.setDate(x.getDate() + 6);
  return endOfDay(x);
}

export function getISOWeekNumber(d: Date): number {
  const t = startOfDay(d);
  t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7));
  const week1 = new Date(t.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((t.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7,
    )
  );
}

function isSameWeek(a: Date, b: Date): boolean {
  const startA = startOfWeekMonday(a);
  const startB = startOfWeekMonday(b);
  return startA.getTime() === startB.getTime();
}

/** Map URL search params to a `createdAt` filter range for invoice queries. */
export function resolveInvoiceDateRange(params: {
  period?: string;
  from?: string;
  to?: string;
  anchor?: string;
}): InvoiceDateRange {
  // Default to all-time so the invoices list does not hide valid records.
  const preset = isPreset(params.period) ? params.period : "all";
  const fromInput = params.from?.trim() ?? "";
  const toInput = params.to?.trim() ?? "";
  const anchorParsed = parseDateInput(params.anchor) ?? new Date();
  const anchorInput = params.anchor?.trim() || toDateInputValue(anchorParsed);

  if (preset === "all") {
    return { preset, from: null, to: null, fromInput, toInput, anchorInput };
  }

  if (preset === "custom") {
    const fromParsed = fromInput ? parseDateInput(fromInput) : null;
    const toParsed = toInput ? parseDateInput(toInput) : null;
    const from = fromParsed ? startOfDay(fromParsed) : null;
    const to = toParsed ? endOfDay(toParsed) : null;
    return { preset, from, to, fromInput, toInput, anchorInput };
  }

  const weekStart = startOfWeekMonday(anchorParsed);
  const weekEnd = endOfWeekSunday(weekStart);
  return {
    preset: "week",
    from: weekStart,
    to: weekEnd,
    fromInput: toDateInputValue(weekStart),
    toInput: toDateInputValue(weekEnd),
    anchorInput,
  };
}

export function formatPeriodToolbarLabel(range: InvoiceDateRange): string {
  if (range.preset === "all") {
    return "All time";
  }

  if (range.preset === "custom" && range.from && range.to) {
    const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
    const w = getISOWeekNumber(range.from);
    return `${fmt.format(range.from)} – ${fmt.format(range.to)} · W${w}`;
  }

  if (range.from && range.to) {
    const w = getISOWeekNumber(range.from);
    if (isSameWeek(range.from, new Date())) {
      return `This week · W${w}`;
    }
    const fmt = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
    return `${fmt.format(range.from)} – ${fmt.format(range.to)} · W${w}`;
  }

  return "This week";
}

export function shiftAnchorByWeeks(anchorInput: string, deltaWeeks: number): string {
  const d = parseDateInput(anchorInput) ?? new Date();
  d.setDate(d.getDate() + deltaWeeks * 7);
  return toDateInputValue(d);
}

export function shiftCustomRange(
  fromInput: string,
  toInput: string,
  deltaWeeks: number,
): { from: string; to: string } {
  const from = parseDateInput(fromInput);
  const to = parseDateInput(toInput);
  if (!from || !to) {
    return { from: fromInput, to: toInput };
  }
  const shift = deltaWeeks * 7;
  from.setDate(from.getDate() + shift);
  to.setDate(to.getDate() + shift);
  return { from: toDateInputValue(from), to: toDateInputValue(to) };
}
