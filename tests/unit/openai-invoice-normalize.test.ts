import { describe, expect, it } from "vitest";

import { normalizeDraftLineItems, normalizeInvoiceDraft } from "@/lib/openai-invoice";

describe("normalizeDraftLineItems", () => {
  it("defaults quantity to 1 and converts major prices to minor units", () => {
    expect(
      normalizeDraftLineItems(
        [
          { name: "Design", price: 12.34 },
          { name: "Review", price: 5, quantity: 2, unitAmountMinor: 500 },
        ],
        "USD",
      ),
    ).toEqual([
      { name: "Design", price: 12.34, quantity: 1, unitAmountMinor: 1234 },
      { name: "Review", price: 5, quantity: 2, unitAmountMinor: 500 },
    ]);
  });
});

describe("normalizeInvoiceDraft", () => {
  it("returns normalized line items for AI/mock drafts", () => {
    const draft = normalizeInvoiceDraft({
      title: "Sample",
      line_items: [
        {
          name: "Discovery & planning (sample line)",
          price: 400,
          quantity: 1,
          unitAmountMinor: 40_000,
        },
        { name: "Design", price: 12.5 },
      ],
      total_amount: 412.5,
    });

    expect(draft.line_items).toEqual([
      {
        name: "Discovery & planning (sample line)",
        price: 400,
        quantity: 1,
        unitAmountMinor: 40_000,
      },
      { name: "Design", price: 12.5, quantity: 1, unitAmountMinor: 1250 },
    ]);
    expect(draft.total_amount).toBe(412.5);
  });
});
