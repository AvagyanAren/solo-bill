import { describe, expect, it } from "vitest";

import {
  canTransitionInvoice,
  getInvoiceStatusDisplay,
  isReminderEligible,
  isSendInvoiceEligible,
  lifecycleTimestamps,
} from "@/lib/billing/lifecycle";

describe("invoice lifecycle", () => {
  const now = new Date(2026, 7, 12, 12);

  it("allows manual payment and reversal but keeps void terminal", () => {
    expect(canTransitionInvoice("unpaid", "paid")).toBe(true);
    expect(canTransitionInvoice("sent", "paid")).toBe(true);
    expect(canTransitionInvoice("paid", "unpaid")).toBe(true);
    expect(canTransitionInvoice("draft", "paid")).toBe(false);
    expect(canTransitionInvoice("void", "draft")).toBe(false);
  });

  it("derives overdue without persisting it as a lifecycle status", () => {
    expect(getInvoiceStatusDisplay("sent", new Date(2026, 7, 11), now)).toBe(
      "overdue",
    );
    expect(getInvoiceStatusDisplay("draft", new Date(2026, 7, 11), now)).toBe(
      "draft",
    );
  });

  it("permits reminders for unpaid invoices and overdue sent invoices", () => {
    expect(isReminderEligible("unpaid", new Date(2026, 7, 20), now)).toBe(true);
    expect(isReminderEligible("unpaid", new Date(2026, 7, 11), now)).toBe(true);
    expect(isReminderEligible("sent", new Date(2026, 7, 11), now)).toBe(true);
    expect(isReminderEligible("sent", new Date(2026, 7, 20), now)).toBe(false);
    expect(isReminderEligible("paid", new Date(2026, 7, 11), now)).toBe(false);
    expect(isReminderEligible("draft", new Date(2026, 7, 11), now)).toBe(false);
  });

  it("allows sending invoices in draft or open statuses", () => {
    expect(isSendInvoiceEligible("draft")).toBe(true);
    expect(isSendInvoiceEligible("sent")).toBe(true);
    expect(isSendInvoiceEligible("unpaid")).toBe(true);
    expect(isSendInvoiceEligible("paid")).toBe(false);
    expect(isSendInvoiceEligible("void")).toBe(false);
  });

  it("clears paidAt when a manual payment is reversed", () => {
    expect(lifecycleTimestamps("paid", "unpaid", now)).toEqual({ paidAt: null });
  });
});
