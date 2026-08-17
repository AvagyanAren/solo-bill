import { describe, expect, it } from "vitest";

import {
  calculateInvoiceTotals,
  calculateLineTotals,
  majorToMinor,
  minorToMajor,
} from "@/lib/billing/money";
import {
  basisPointsToPercentage,
  percentageToBasisPoints,
} from "@/lib/billing/tax";

describe("billing money and tax", () => {
  it("converts major units without retaining floating-point drift", () => {
    expect(majorToMinor(10.1 + 20.2, "USD")).toBe(3030);
    expect(minorToMajor(3030, "USD")).toBe(30.3);
    expect(majorToMinor(100, "JPY")).toBe(100);
  });

  it("rounds tax once per normalized line", () => {
    expect(
      calculateLineTotals({
        quantity: 3,
        unitAmountMinor: 333,
        taxRateBps: 725,
      }),
    ).toEqual({
      subtotalMinor: 999,
      taxMinor: 72,
      totalMinor: 1071,
    });
  });

  it("sums lines and applies an integer minor-unit discount", () => {
    expect(
      calculateInvoiceTotals(
        [
          { subtotalMinor: 1000, taxMinor: 100, totalMinor: 1100 },
          { subtotalMinor: 500, taxMinor: 50, totalMinor: 550 },
        ],
        200,
      ),
    ).toEqual({
      subtotalMinor: 1500,
      taxMinor: 150,
      discountMinor: 200,
      totalMinor: 1450,
    });
  });

  it("represents tax rates as basis points", () => {
    expect(percentageToBasisPoints(7.25)).toBe(725);
    expect(basisPointsToPercentage(725)).toBe(7.25);
    expect(() => percentageToBasisPoints(-1)).toThrow();
    expect(() => basisPointsToPercentage(10_001)).toThrow();
  });

  it("rejects discounts larger than the taxable invoice total", () => {
    expect(() =>
      calculateInvoiceTotals([{ subtotalMinor: 100, taxMinor: 0, totalMinor: 100 }], 101),
    ).toThrow(/Discount cannot exceed/);
  });
});
