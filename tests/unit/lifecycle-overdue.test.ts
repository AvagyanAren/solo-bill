import { describe, expect, it } from "vitest";

import {
  daysPastDue,
  isInvoiceOverdue,
  isPastDueDate,
  overdueDueDateCutoff,
  prismaOverdueDueDateFilter,
} from "@/lib/billing/lifecycle";

describe("overdue helpers", () => {
  it("treats due day as not overdue until end of that day", () => {
    const due = new Date("2026-08-18T00:00:00");
    const afternoon = new Date("2026-08-18T15:00:00");
    const nextMorning = new Date("2026-08-19T00:00:01");

    expect(isPastDueDate(due, afternoon)).toBe(false);
    expect(isInvoiceOverdue("unpaid", due, afternoon)).toBe(false);
    expect(isPastDueDate(due, nextMorning)).toBe(true);
    expect(isInvoiceOverdue("unpaid", due, nextMorning)).toBe(true);
    expect(isInvoiceOverdue("paid", due, nextMorning)).toBe(false);
  });

  it("aligns Prisma cutoff with end-of-due-day semantics for midnight due dates", () => {
    const now = new Date("2026-08-19T10:00:00");
    const cutoff = overdueDueDateCutoff(now);
    expect(cutoff.getHours()).toBe(0);
    expect(prismaOverdueDueDateFilter(now).lt.getTime()).toBe(cutoff.getTime());

    const dueYesterday = new Date("2026-08-18T00:00:00");
    const dueToday = new Date("2026-08-19T00:00:00");
    expect(dueYesterday < cutoff).toBe(true);
    expect(dueToday < cutoff).toBe(false);
  });

  it("counts whole days past due", () => {
    const due = new Date("2026-08-01T00:00:00");
    const now = new Date("2026-08-18T12:00:00");
    expect(daysPastDue(due, now)).toBe(17);
    expect(daysPastDue(due, new Date("2026-08-01T12:00:00"))).toBe(0);
  });
});
