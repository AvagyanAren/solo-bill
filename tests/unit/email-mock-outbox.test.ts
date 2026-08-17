import { describe, expect, it } from "vitest";

import { getEmailAdapter, shouldUseMockEmail } from "@/lib/email/adapter";
import { createMockEmailAdapter } from "@/lib/email/mock-adapter";
import { composeInvoiceEmail, defaultInvoiceSubject } from "@/lib/email/compose";

describe("mock email outbox", () => {
  it("defaults to mock email outside an explicit live provider", () => {
    expect(shouldUseMockEmail({ NODE_ENV: "development" })).toBe(true);
    expect(shouldUseMockEmail({ NODE_ENV: "production" })).toBe(true);
    expect(shouldUseMockEmail({ SOLOBILL_MOCK_EMAIL: "1" })).toBe(true);
    expect(shouldUseMockEmail({ SOLOBILL_MOCK_EMAIL: "0", NODE_ENV: "production" })).toBe(
      true,
    );
  });

  it("accepts valid messages and rejects incomplete ones", async () => {
    const adapter = createMockEmailAdapter();
    const ok = await adapter.send({
      to: "client@example.com",
      subject: "Invoice INV-1",
      bodyText: "Please pay.",
      idempotencyKey: "test_key_1",
    });
    expect(ok.ok).toBe(true);
    if (ok.ok) {
      expect(ok.mock).toBe(true);
      expect(ok.providerMessageId).toContain("mock_");
    }

    const bad = await adapter.send({
      to: "not-an-email",
      subject: "x",
      bodyText: "y",
    });
    expect(bad.ok).toBe(false);
  });

  it("resolves the mock adapter from getEmailAdapter", async () => {
    const adapter = getEmailAdapter({ SOLOBILL_MOCK_EMAIL: "1" });
    expect(adapter.isMock).toBe(true);
    expect(adapter.name).toBe("mock");
  });

  it("composes invoice and reminder copy", () => {
    const base = {
      invoiceNumber: "INV-2026-0001",
      title: "Website work",
      totalMinor: 12500,
      currency: "USD",
      dueDate: new Date(2026, 7, 20),
      businessName: "Aren Studio",
      clientName: "Alex",
    };
    expect(defaultInvoiceSubject({ ...base, kind: "invoice" })).toContain("INV-2026-0001");
    expect(defaultInvoiceSubject({ ...base, kind: "reminder" })).toContain("Reminder");
    const composed = composeInvoiceEmail({ ...base, kind: "invoice" });
    expect(composed.bodyText).toContain("Alex");
    expect(composed.bodyText).toContain("mock outbox");
  });
});
