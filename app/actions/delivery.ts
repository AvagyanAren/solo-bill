"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ownedInvoiceWhere } from "@/lib/billing/authorization";
import {
  assertInvoiceTransition,
  isReminderEligible,
  isSendInvoiceEligible,
  lifecycleTimestamps,
  type BillingInvoiceStatus,
} from "@/lib/billing/lifecycle";
import { composeInvoiceEmail } from "@/lib/email/compose";
import { getEmailAdapter } from "@/lib/email/adapter";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";

export type DeliveryActionResult =
  | {
      ok: true;
      reminderRunId: string;
      status: "sent" | "failed";
      invoiceStatus: BillingInvoiceStatus;
      mock: boolean;
    }
  | {
      ok: false;
      error: string;
    };

const sendPayloadSchema = z.object({
  invoiceId: z.string().min(1),
  recipient: z.string().trim().email("Enter a valid recipient email."),
  subject: z.string().trim().max(200).optional(),
  bodyText: z.string().trim().max(8000).optional(),
});

function revalidateDeliveryPaths(invoiceId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  revalidatePath(`/invoice/${invoiceId}`);
}

function makeIdempotencyKey(invoiceId: string, kind: "invoice" | "reminder") {
  return `${kind}_${invoiceId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

async function deliverInvoiceMessage(options: {
  kind: "invoice" | "reminder";
  raw: unknown;
}): Promise<DeliveryActionResult> {
  const session = await requireSession();
  const parsed = sendPayloadSchema.safeParse(options.raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const { invoiceId, recipient, subject, bodyText } = parsed.data;
  const invoice = await prisma.invoice.findFirst({
    where: ownedInvoiceWhere(session.userId, { id: invoiceId }),
    include: {
      client: true,
      user: { include: { businessProfile: true } },
    },
  });

  if (!invoice) {
    return { ok: false, error: "Invoice not found." };
  }

  const status = invoice.status as BillingInvoiceStatus;

  if (options.kind === "invoice" && !isSendInvoiceEligible(status)) {
    return { ok: false, error: "This invoice cannot be emailed in its current status." };
  }
  if (options.kind === "reminder" && !isReminderEligible(status, invoice.dueDate)) {
    return {
      ok: false,
      error: "Reminders are only available for unpaid or overdue invoices.",
    };
  }

  const businessName =
    invoice.user.businessProfile?.displayName ||
    invoice.user.businessProfile?.legalName ||
    session.email;
  const clientName = invoice.client.contactName || invoice.client.name;
  const composed = composeInvoiceEmail({
    kind: options.kind,
    invoiceNumber: invoice.invoiceNumber,
    title: invoice.title,
    totalMinor: invoice.totalMinor,
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    businessName,
    clientName,
    customSubject: subject,
    customBody: bodyText,
  });

  const idempotencyKey = makeIdempotencyKey(invoiceId, options.kind);
  const now = new Date();

  const reminderRun = await prisma.reminderRun.create({
    data: {
      invoiceId,
      userId: session.userId,
      kind: options.kind,
      channel: "email",
      recipient,
      subject: composed.subject,
      bodyText: composed.bodyText,
      status: "processing",
      idempotencyKey,
      attemptedAt: now,
      lockedAt: now,
      attemptCount: 1,
    },
  });

  await prisma.invoiceActivity.create({
    data: {
      invoiceId,
      actorUserId: session.userId,
      type: options.kind === "invoice" ? "email_queued" : "reminder_queued",
      metadataJson: JSON.stringify({
        reminderRunId: reminderRun.id,
        recipient,
        subject: composed.subject,
        mock: true,
      }),
    },
  });

  const adapter = getEmailAdapter();
  const sendResult = await adapter.send({
    to: recipient,
    subject: composed.subject,
    bodyText: composed.bodyText,
    idempotencyKey,
  });

  if (!sendResult.ok) {
    await prisma.reminderRun.update({
      where: { id: reminderRun.id },
      data: {
        status: "failed",
        failedAt: new Date(),
        failureReason: sendResult.error,
        lockedAt: null,
      },
    });
    await prisma.invoiceActivity.create({
      data: {
        invoiceId,
        actorUserId: session.userId,
        type: options.kind === "invoice" ? "email_failed" : "reminder_failed",
        metadataJson: JSON.stringify({
          reminderRunId: reminderRun.id,
          recipient,
          subject: composed.subject,
          failureReason: sendResult.error,
          mock: sendResult.mock,
        }),
      },
    });
    revalidateDeliveryPaths(invoiceId);
    return { ok: false, error: sendResult.error };
  }

  const sentAt = new Date();
  let nextStatus = status;

  await prisma.$transaction(async (tx) => {
    await tx.reminderRun.update({
      where: { id: reminderRun.id },
      data: {
        status: "sent",
        sentAt,
        providerMessageId: sendResult.providerMessageId,
        lockedAt: null,
        failureReason: null,
        failedAt: null,
      },
    });

    const movedDraftToSent = options.kind === "invoice" && status === "draft";
    await tx.invoiceActivity.create({
      data: {
        invoiceId,
        actorUserId: session.userId,
        type: options.kind === "invoice" ? "email_sent" : "reminder_sent",
        previousStatus: movedDraftToSent ? status : undefined,
        nextStatus: movedDraftToSent ? "sent" : undefined,
        metadataJson: JSON.stringify({
          reminderRunId: reminderRun.id,
          recipient,
          subject: composed.subject,
          providerMessageId: sendResult.providerMessageId,
          mock: sendResult.mock,
        }),
      },
    });

    if (options.kind === "invoice") {
      if (movedDraftToSent) {
        assertInvoiceTransition("draft", "sent");
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            status: "sent",
            revision: { increment: 1 },
            revisedAt: sentAt,
            ...lifecycleTimestamps("draft", "sent", sentAt),
          },
        });
        nextStatus = "sent";
      } else {
        await tx.invoice.update({
          where: { id: invoiceId },
          data: { sentAt: invoice.sentAt ?? sentAt },
        });
      }
    }
  });

  revalidateDeliveryPaths(invoiceId);
  return {
    ok: true,
    reminderRunId: reminderRun.id,
    status: "sent",
    invoiceStatus: nextStatus,
    mock: sendResult.mock,
  };
}

export async function sendInvoiceEmailAction(
  payload: unknown,
): Promise<DeliveryActionResult> {
  return deliverInvoiceMessage({ kind: "invoice", raw: payload });
}

export async function sendInvoiceReminderAction(
  payload: unknown,
): Promise<DeliveryActionResult> {
  return deliverInvoiceMessage({ kind: "reminder", raw: payload });
}
