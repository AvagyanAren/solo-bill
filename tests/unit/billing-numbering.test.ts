import { describe, expect, it } from "vitest";

import {
  formatInvoiceNumber,
  normalizeInvoicePrefix,
} from "@/lib/billing/numbering";

describe("invoice numbering", () => {
  it("normalizes a configurable prefix and pads the sequence", () => {
    expect(
      formatInvoiceNumber({
        prefix: " solo bill ",
        sequence: 42,
        issueDate: new Date("2026-08-12T12:00:00Z"),
      }),
    ).toBe("SOLO-BILL-2026-0042");
  });

  it("rejects empty prefixes and invalid sequences", () => {
    expect(() => normalizeInvoicePrefix("---")).toThrow();
    expect(() =>
      formatInvoiceNumber({
        prefix: "INV",
        sequence: 0,
        issueDate: new Date("2026-08-12T12:00:00Z"),
      }),
    ).toThrow();
  });
});
