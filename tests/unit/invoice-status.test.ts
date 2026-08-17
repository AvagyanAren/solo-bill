import { describe, expect, it } from "vitest";

import { getInvoiceStatusDisplay, invoiceStatusLabel } from "@/lib/invoice-status";

describe("invoice status", () => {
  const now = new Date(2026, 7, 12, 12);

  it("keeps paid invoices paid regardless of due date", () => {
    expect(getInvoiceStatusDisplay("paid", new Date(2020, 0, 1), now)).toBe("paid");
  });

  it("marks an unpaid invoice overdue after its due day", () => {
    expect(getInvoiceStatusDisplay("unpaid", new Date(2026, 7, 11), now)).toBe("overdue");
  });

  it("keeps an unpaid invoice due today unpaid", () => {
    expect(getInvoiceStatusDisplay("unpaid", new Date(2026, 7, 12), now)).toBe("unpaid");
  });

  it.each([
    ["paid", "Paid"],
    ["unpaid", "Unpaid"],
    ["overdue", "Overdue"],
    ["draft", "Draft"],
    ["sent", "Sent"],
    ["void", "Void"],
  ] as const)("labels %s invoices", (status, label) => {
    expect(invoiceStatusLabel(status)).toBe(label);
  });
});
