const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDateInput(value: string | undefined): Date | null {
  const match = DATE_INPUT_PATTERN.exec(value?.trim() ?? "");
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

export function parseInvoiceDueDate(value: string): Date | null {
  const parsed = parseDateInput(value);
  if (!parsed) {
    return null;
  }
  return new Date(
    Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0),
  );
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function endOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

export function addCalendarDays(date: Date, days: number): Date {
  if (!Number.isSafeInteger(days)) {
    throw new RangeError("Days must be a safe integer.");
  }
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function dueDateFromTerms(issueDate: Date, paymentTermsDays: number): Date {
  if (!Number.isSafeInteger(paymentTermsDays) || paymentTermsDays < 0) {
    throw new RangeError("Payment terms must be a non-negative integer.");
  }
  return addCalendarDays(issueDate, paymentTermsDays);
}

export function computeDueDateFromIssue(
  issueDate: string,
  paymentTermsDays: number,
): string | null {
  const parsed = parseDateInput(issueDate);
  if (!parsed) {
    return null;
  }
  try {
    const due = dueDateFromTerms(parsed, paymentTermsDays);
    const y = due.getFullYear();
    const m = String(due.getMonth() + 1).padStart(2, "0");
    const d = String(due.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  } catch {
    return null;
  }
}
