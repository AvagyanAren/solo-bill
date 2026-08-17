import { describe, expect, it } from "vitest";

import {
  ownedClientWhere,
  ownedInvoiceWhere,
  ownedReminderRunWhere,
} from "@/lib/billing/authorization";
import {
  dueDateFromTerms,
  parseDateInput,
  parseInvoiceDueDate,
} from "@/lib/billing/dates";

describe("billing dates", () => {
  it("rejects impossible date-only values", () => {
    expect(parseDateInput("2026-02-29")).toBeNull();
    expect(parseDateInput("not-a-date")).toBeNull();
  });

  it("stores submitted due dates at UTC noon", () => {
    expect(parseInvoiceDueDate("2026-08-12")?.toISOString()).toBe(
      "2026-08-12T12:00:00.000Z",
    );
  });

  it("derives a due date from non-negative payment terms", () => {
    const issueDate = new Date(2026, 7, 12, 9);
    expect(dueDateFromTerms(issueDate, 30).getDate()).toBe(11);
  });
});

describe("ownership filters", () => {
  it("always scopes billing records to the authenticated user", () => {
    expect(ownedClientWhere("user-1", { id: "client-1" })).toEqual({
      id: "client-1",
      userId: "user-1",
    });
    expect(ownedInvoiceWhere("user-1", { id: "invoice-1" })).toEqual({
      id: "invoice-1",
      userId: "user-1",
    });
    expect(ownedReminderRunWhere("user-1")).toEqual({ userId: "user-1" });
  });
});
