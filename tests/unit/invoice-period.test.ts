import { describe, expect, it } from "vitest";

import {
  getISOWeekNumber,
  resolveInvoiceDateRange,
  shiftAnchorByWeeks,
  shiftCustomRange,
  startOfWeekMonday,
  toDateInputValue,
} from "@/lib/invoice-period";

describe("invoice periods", () => {
  it("starts weeks on Monday", () => {
    const monday = startOfWeekMonday(new Date(2026, 7, 12));

    expect(toDateInputValue(monday)).toBe("2026-08-10");
    expect(monday.getHours()).toBe(0);
  });

  it("resolves a weekly range around its anchor", () => {
    const range = resolveInvoiceDateRange({ period: "week", anchor: "2026-08-12" });

    expect(range.fromInput).toBe("2026-08-10");
    expect(range.toInput).toBe("2026-08-16");
    expect(range.from?.getHours()).toBe(0);
    expect(range.to?.getHours()).toBe(23);
  });

  it("defaults to all-time when period is omitted", () => {
    const range = resolveInvoiceDateRange({});

    expect(range.preset).toBe("all");
    expect(range.from).toBeNull();
    expect(range.to).toBeNull();
  });

  it("returns no boundaries for all-time ranges", () => {
    const range = resolveInvoiceDateRange({ period: "all" });

    expect(range.from).toBeNull();
    expect(range.to).toBeNull();
  });

  it("shifts anchors and custom ranges by whole weeks", () => {
    expect(shiftAnchorByWeeks("2026-08-12", 1)).toBe("2026-08-19");
    expect(shiftCustomRange("2026-08-01", "2026-08-05", -1)).toEqual({
      from: "2026-07-25",
      to: "2026-07-29",
    });
  });

  it("calculates ISO week numbers across year boundaries", () => {
    expect(getISOWeekNumber(new Date(2026, 0, 1))).toBe(1);
  });
});
