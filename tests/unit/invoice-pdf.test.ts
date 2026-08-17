import { describe, expect, it } from "vitest";

import { renderInvoicePdf } from "@/lib/pdf/invoice-pdf";

describe("invoice PDF renderer", () => {
  it("renders a PDF buffer with invoice content", async () => {
    const pdf = await renderInvoicePdf({
      invoiceNumber: "INV-2026-0001",
      title: "Design sprint",
      description: "Product UI work for August.",
      status: "sent",
      currency: "USD",
      issueDate: new Date(2026, 7, 1),
      dueDate: new Date(2026, 7, 15),
      notes: "Thanks for your business.",
      terms: "Net 14",
      subtotalMinor: 10000,
      taxMinor: 800,
      discountMinor: 0,
      totalMinor: 10800,
      business: {
        displayName: "Aren Studio",
        email: "hello@aren.example",
        addressLine1: "1 Market St",
        city: "San Francisco",
        countryCode: "US",
      },
      client: {
        name: "Acme",
        email: "billing@acme.example",
        companyName: "Acme Co",
      },
      lineItems: [
        {
          description: "Design hours",
          quantity: 4,
          unitAmountMinor: 2500,
          taxRateBps: 800,
          taxMinor: 800,
          totalMinor: 10800,
        },
      ],
    });

    expect(pdf.byteLength).toBeGreaterThan(500);
    expect(pdf.subarray(0, 4).toString("utf8")).toBe("%PDF");
  });
});
