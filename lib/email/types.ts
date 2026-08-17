export type EmailMessage = {
  to: string;
  subject: string;
  bodyText: string;
  /** Optional correlation for logging / ReminderRun.providerMessageId */
  idempotencyKey?: string;
};

export type EmailSendResult =
  | {
      ok: true;
      providerMessageId: string;
      mock: boolean;
    }
  | {
      ok: false;
      error: string;
      mock: boolean;
    };

export type EmailAdapter = {
  readonly name: string;
  readonly isMock: boolean;
  send(message: EmailMessage): Promise<EmailSendResult>;
};
