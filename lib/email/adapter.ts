import { createMockEmailAdapter } from "@/lib/email/mock-adapter";
import type { EmailAdapter } from "@/lib/email/types";

export type EmailEnv = {
  NODE_ENV?: string;
  SOLOBILL_MOCK_EMAIL?: string;
};

/**
 * Resolve the email delivery adapter.
 *
 * - `SOLOBILL_MOCK_EMAIL=1` → always mock (recommended for local / CI).
 * - Unset in development → mock by default (safe local outbox).
 * - Production without mock → still mock in this Phase 5 scope (no external providers).
 *
 * Future: swap in a real provider behind this boundary; a scheduler can enqueue
 * ReminderRun rows and call the same adapter.
 */
export function shouldUseMockEmail(env: EmailEnv = process.env): boolean {
  const flag = env.SOLOBILL_MOCK_EMAIL?.trim();
  if (flag === "1" || flag?.toLowerCase() === "true") {
    return true;
  }
  if (flag === "0" || flag?.toLowerCase() === "false") {
    // Phase 5: no live provider is wired — still use mock so we never call external APIs.
    return true;
  }
  if (env.NODE_ENV !== "production") {
    return true;
  }
  // Production Phase 5: keep mock until a provider adapter is implemented.
  return true;
}

export function getEmailAdapter(env: EmailEnv = process.env): EmailAdapter {
  if (shouldUseMockEmail(env)) {
    return createMockEmailAdapter();
  }
  // Defensive: Phase 5 never leaves this boundary for a live SMTP/API client.
  return createMockEmailAdapter();
}
