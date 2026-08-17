import type { EmailAdapter, EmailMessage, EmailSendResult } from "@/lib/email/types";

/**
 * Local outbox adapter — never contacts an external provider.
 * Messages are accepted immediately so ReminderRun / InvoiceActivity can persist delivery.
 */
export function createMockEmailAdapter(): EmailAdapter {
  return {
    name: "mock",
    isMock: true,
    async send(message: EmailMessage): Promise<EmailSendResult> {
      const to = message.to.trim();
      if (!to || !to.includes("@")) {
        return {
          ok: false,
          error: "Recipient email is invalid.",
          mock: true,
        };
      }
      if (!message.subject.trim()) {
        return {
          ok: false,
          error: "Subject is required.",
          mock: true,
        };
      }
      if (!message.bodyText.trim()) {
        return {
          ok: false,
          error: "Message body is required.",
          mock: true,
        };
      }

      const providerMessageId = `mock_${message.idempotencyKey ?? Date.now().toString(36)}`;
      return {
        ok: true,
        providerMessageId,
        mock: true,
      };
    },
  };
}
