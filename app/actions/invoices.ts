"use server";

import { loadEnvConfig } from "@next/env";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ownedClientWhere, ownedInvoiceWhere } from "@/lib/billing/authorization";
import { dueDateFromTerms, parseInvoiceDueDate, parseDateInput } from "@/lib/billing/dates";
import {
  assertInvoiceTransition,
  canTransitionInvoice,
  lifecycleTimestamps,
  type BillingInvoiceStatus,
  INVOICE_STATUSES,
} from "@/lib/billing/lifecycle";
import {
  calculateInvoiceTotals,
  calculateLineTotals,
  majorToMinor,
  minorToMajor,
} from "@/lib/billing/money";
import { formatInvoiceNumber } from "@/lib/billing/numbering";
import { percentageToBasisPoints } from "@/lib/billing/tax";
import { prisma } from "@/lib/db";
import {
  generateInvoiceDraftFromText,
  getMockInvoiceDraftForPreview,
  isClientSampleDraftAllowed,
  normalizeInvoiceDraft,
} from "@/lib/openai-invoice";
import { requireSession } from "@/lib/require-session";

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

const editorLineSchema = z.object({
  description: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive(),
  unitAmountMajor: z.coerce.number().finite(),
  taxRatePercent: z.coerce.number().min(0).max(100).default(0),
});

const invoiceEditorSchema = z.object({
  id: z.string().min(1).optional(),
  revision: z.coerce.number().int().nonnegative().optional(),
  clientId: z.string().min(1, "Choose a client."),
  title: z.string().trim().min(1, "Add a title."),
  description: z.string().trim().min(1, "Add a work description."),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(CURRENCY_PATTERN, "Currency must be a 3-letter code."),
  invoiceNumber: z.string().trim().optional(),
  autoInvoiceNumber: z.boolean().optional(),
  issueDate: z.string().min(1, "Choose an issue date."),
  dueDate: z.string().min(1, "Choose a due date."),
  paymentTermsDays: z.coerce.number().int().min(0).max(3650).default(14),
  discountMajor: z.coerce.number().finite().min(0).default(0),
  notes: z.string().optional(),
  terms: z.string().optional(),
  internalNotes: z.string().optional(),
  lineItems: z.array(editorLineSchema).min(1, "Add at least one line item."),
});

export type InvoiceEditorInput = z.infer<typeof invoiceEditorSchema>;

export type InvoiceActionResult =
  | {
      ok: true;
      invoiceId: string;
      revision: number;
      invoiceNumber: string;
      status: BillingInvoiceStatus;
      previousStatus?: BillingInvoiceStatus;
    }
  | {
      ok: false;
      error: string;
      conflict?: boolean;
      revision?: number;
    };

export type CreateInvoiceState = {
  error?: string;
};

export type DraftInvoiceOptions = {
  /** Fill sample line items (no OpenAI). Allowed in development or when `SOLOBILL_MOCK_INVOICE_AI=1`. */
  useSampleLines?: boolean;
};

type NormalizedPersistedLine = {
  description: string;
  quantity: number;
  unitAmountMinor: number;
  taxRateBps: number;
  sortOrder: number;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
};

function revalidateInvoicePaths(invoiceId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/invoices");
  if (invoiceId) {
    revalidatePath(`/invoice/${invoiceId}`);
    revalidatePath(`/invoice/${invoiceId}/edit`);
  }
}

function parseEditorPayload(
  raw: unknown,
): { ok: true; data: InvoiceEditorInput } | { ok: false; error: string } {
  const parsed = invoiceEditorSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  return { ok: true, data: parsed.data };
}

function buildNormalizedLines(
  items: InvoiceEditorInput["lineItems"],
  currency: string,
): { ok: true; lines: NormalizedPersistedLine[] } | { ok: false; error: string } {
  try {
    const lines = items.map((item, sortOrder) => {
      const unitAmountMinor = majorToMinor(item.unitAmountMajor, currency);
      const taxRateBps = percentageToBasisPoints(item.taxRatePercent);
      const totals = calculateLineTotals({
        quantity: item.quantity,
        unitAmountMinor,
        taxRateBps,
      });
      return {
        description: item.description,
        quantity: item.quantity,
        unitAmountMinor,
        taxRateBps,
        sortOrder,
        ...totals,
      };
    });
    return { ok: true, lines };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to calculate line totals.",
    };
  }
}

function legacyLineItemsJson(lines: NormalizedPersistedLine[], currency: string) {
  return JSON.stringify(
    lines.map((line) => ({
      name: line.description,
      price: minorToMajor(line.quantity * line.unitAmountMinor, currency),
      quantity: line.quantity,
      unitAmountMinor: line.unitAmountMinor,
    })),
  );
}

async function allocateInvoiceNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  userId: string,
  email: string,
  issueDate: Date,
  preferred?: string,
) {
  const trimmed = preferred?.trim();
  if (trimmed) {
    const clash = await tx.invoice.findFirst({
      where: { userId, invoiceNumber: trimmed },
      select: { id: true },
    });
    if (clash) {
      throw new Error("That invoice number is already in use.");
    }
    return trimmed;
  }

  const profile = await tx.businessProfile.upsert({
    where: { userId },
    update: {},
    create: { userId, email },
    select: { invoicePrefix: true, nextInvoiceSequence: true },
  });
  const invoiceNumber = formatInvoiceNumber({
    prefix: profile.invoicePrefix,
    sequence: profile.nextInvoiceSequence,
    issueDate,
  });
  await tx.businessProfile.update({
    where: { userId },
    data: { nextInvoiceSequence: { increment: 1 } },
  });
  return invoiceNumber;
}

async function persistInvoiceEditor(options: {
  session: { userId: string; email: string };
  data: InvoiceEditorInput;
  mode: "draft" | "finalize" | "update";
}): Promise<InvoiceActionResult> {
  const { session, data, mode } = options;

  const client = await prisma.client.findFirst({
    where: ownedClientWhere(session.userId, { id: data.clientId }),
  });
  if (!client) {
    return { ok: false, error: "Client not found." };
  }

  const issue = parseInvoiceDueDate(data.issueDate);
  const due = parseInvoiceDueDate(data.dueDate);
  if (!issue) {
    return { ok: false, error: "Choose a valid issue date." };
  }
  if (!due) {
    return { ok: false, error: "Choose a valid due date." };
  }

  const linesResult = buildNormalizedLines(data.lineItems, data.currency);
  if (!linesResult.ok) {
    return linesResult;
  }

  let discountMinor = 0;
  try {
    discountMinor = majorToMinor(data.discountMajor, data.currency);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid discount.",
    };
  }

  let totals;
  try {
    totals = calculateInvoiceTotals(linesResult.lines, discountMinor);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to calculate invoice totals.",
    };
  }

  if (mode === "finalize" && totals.totalMinor <= 0) {
    return { ok: false, error: "Amount must be greater than zero." };
  }

  const autoNumber = data.autoInvoiceNumber !== false && !data.invoiceNumber?.trim();

  try {
    const saved = await prisma.$transaction(async (tx) => {
      const existing = data.id
        ? await tx.invoice.findFirst({
            where: ownedInvoiceWhere(session.userId, { id: data.id }),
            select: {
              id: true,
              revision: true,
              status: true,
              invoiceNumber: true,
            },
          })
        : null;

      if (data.id && !existing) {
        return { kind: "missing" as const };
      }

      if (existing && data.revision != null && existing.revision !== data.revision) {
        return { kind: "conflict" as const, revision: existing.revision };
      }

      if (existing && mode === "draft" && existing.status !== "draft") {
        return { kind: "error" as const, error: "Only draft invoices can be autosaved." };
      }

      const invoiceNumber =
        existing && !autoNumber && data.invoiceNumber?.trim()
          ? data.invoiceNumber.trim()
          : existing && (autoNumber || !data.invoiceNumber?.trim())
            ? existing.invoiceNumber
            : await allocateInvoiceNumber(
                tx,
                session.userId,
                session.email,
                issue,
                autoNumber ? undefined : data.invoiceNumber,
              );

      if (existing && data.invoiceNumber?.trim() && data.invoiceNumber.trim() !== existing.invoiceNumber) {
        const clash = await tx.invoice.findFirst({
          where: {
            userId: session.userId,
            invoiceNumber: data.invoiceNumber.trim(),
            NOT: { id: existing.id },
          },
          select: { id: true },
        });
        if (clash) {
          return { kind: "error" as const, error: "That invoice number is already in use." };
        }
      }

      const nextStatus: BillingInvoiceStatus =
        mode === "finalize"
          ? existing?.status === "draft" || !existing
            ? "unpaid"
            : (existing.status as BillingInvoiceStatus)
          : existing
            ? (existing.status as BillingInvoiceStatus)
            : "draft";

      const commonData = {
        clientId: client.id,
        invoiceNumber,
        title: data.title,
        description: data.description,
        currency: data.currency,
        ...totals,
        issueDate: issue,
        dueDate: due,
        notes: data.notes?.trim() || null,
        terms: data.terms?.trim() || null,
        internalNotes: data.internalNotes?.trim() || null,
        lineItemsJson: legacyLineItemsJson(linesResult.lines, data.currency),
        amount: minorToMajor(totals.totalMinor, data.currency),
      };

      if (!existing) {
        const created = await tx.invoice.create({
          data: {
            userId: session.userId,
            status: nextStatus,
            ...commonData,
            revision: 1,
            revisedAt: null,
            lineItems: { create: linesResult.lines },
            activities: {
              create: {
                actorUserId: session.userId,
                type: "created",
                nextStatus,
              },
            },
            ...(mode === "finalize" ? lifecycleTimestamps("draft", nextStatus) : {}),
          },
          select: { id: true, revision: true, invoiceNumber: true, status: true },
        });
        return { kind: "ok" as const, invoice: created };
      }

      await tx.invoiceLineItem.deleteMany({ where: { invoiceId: existing.id } });
      const updated = await tx.invoice.update({
        where: { id: existing.id },
        data: {
          ...commonData,
          status: nextStatus,
          revision: { increment: 1 },
          revisedAt: new Date(),
          lineItems: { create: linesResult.lines },
          activities: {
            create: {
              actorUserId: session.userId,
              type: mode === "finalize" && existing.status === "draft" ? "status_changed" : "updated",
              previousStatus: existing.status,
              nextStatus,
            },
          },
          ...(mode === "finalize" && existing.status === "draft"
            ? lifecycleTimestamps("draft", nextStatus)
            : {}),
        },
        select: { id: true, revision: true, invoiceNumber: true, status: true },
      });
      return { kind: "ok" as const, invoice: updated };
    });

    if (saved.kind === "missing") {
      return { ok: false, error: "Invoice not found." };
    }
    if (saved.kind === "conflict") {
      return {
        ok: false,
        error: "This invoice changed elsewhere. Reload to continue.",
        conflict: true,
        revision: saved.revision,
      };
    }
    if (saved.kind === "error") {
      return { ok: false, error: saved.error };
    }

    revalidateInvoicePaths(saved.invoice.id);
    return {
      ok: true,
      invoiceId: saved.invoice.id,
      revision: saved.invoice.revision,
      invoiceNumber: saved.invoice.invoiceNumber,
      status: saved.invoice.status as BillingInvoiceStatus,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to save invoice.",
    };
  }
}

export async function draftInvoiceFromDescription(
  description: string,
  options: DraftInvoiceOptions = {},
): Promise<
  | { ok: false; error: string }
  | {
      ok: true;
      draft: {
        title: string;
        line_items: {
          name: string;
          price: number;
          quantity: number;
          unitAmountMinor: number;
        }[];
        total_amount: number;
      };
    }
> {
  await requireSession();
  loadEnvConfig(process.cwd());
  const trimmed = description.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter what you worked on." };
  }

  const raw = options.useSampleLines
    ? (() => {
        if (!isClientSampleDraftAllowed()) {
          return {
            ok: false as const,
            error:
              "Sample line items are only available in development or when SOLOBILL_MOCK_INVOICE_AI=1.",
          };
        }
        return { ok: true as const, draft: getMockInvoiceDraftForPreview(trimmed) };
      })()
    : await generateInvoiceDraftFromText(trimmed);

  if (!raw.ok) {
    return raw;
  }

  const normalized = normalizeInvoiceDraft(raw.draft);
  return {
    ok: true,
    draft: {
      title: normalized.title,
      line_items: normalized.line_items.map((item) => ({
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        unitAmountMinor: item.unitAmountMinor,
      })),
      total_amount: normalized.total_amount,
    },
  };
}

/** Debounced draft autosave — creates or updates a draft with revision checks. */
export async function saveInvoiceDraftAction(
  payload: unknown,
): Promise<InvoiceActionResult> {
  const session = await requireSession();
  const parsed = parseEditorPayload(payload);
  if (!parsed.ok) {
    return parsed;
  }
  return persistInvoiceEditor({ session, data: parsed.data, mode: "draft" });
}

/** Validate, recalculate totals, and finalize a draft (or create as unpaid). */
export async function finalizeInvoiceAction(
  payload: unknown,
): Promise<InvoiceActionResult> {
  const session = await requireSession();
  const parsed = parseEditorPayload(payload);
  if (!parsed.ok) {
    return parsed;
  }
  return persistInvoiceEditor({ session, data: parsed.data, mode: "finalize" });
}

/** Update an existing invoice (draft or issued) without forcing finalize. */
export async function updateInvoiceAction(
  payload: unknown,
): Promise<InvoiceActionResult> {
  const session = await requireSession();
  const parsed = parseEditorPayload(payload);
  if (!parsed.ok) {
    return parsed;
  }
  if (!parsed.data.id) {
    return { ok: false, error: "Missing invoice id." };
  }
  return persistInvoiceEditor({ session, data: parsed.data, mode: "update" });
}

/** Compatibility wrapper for the previous form-based create path. */
export async function createInvoiceAction(
  _prev: CreateInvoiceState | undefined,
  formData: FormData,
): Promise<CreateInvoiceState> {
  const lineItemsRaw = formData.get("lineItemsJson");
  if (typeof lineItemsRaw !== "string") {
    return { error: "Missing line items." };
  }

  let lineItemsParsed: unknown;
  try {
    lineItemsParsed = JSON.parse(lineItemsRaw);
  } catch {
    return { error: "Invalid line items data." };
  }

  const legacyLines = z
    .array(
      z.object({
        name: z.string().min(1),
        price: z.coerce.number().finite(),
        quantity: z.coerce.number().int().positive().optional(),
        unitAmountMinor: z.coerce.number().int().optional(),
      }),
    )
    .min(1)
    .safeParse(lineItemsParsed);

  if (!legacyLines.success) {
    return { error: "Add at least one line item with a label and a valid price." };
  }

  const currency = String(formData.get("currency") ?? "USD").trim().toUpperCase() || "USD";
  const result = await finalizeInvoiceAction({
    clientId: formData.get("clientId"),
    dueDate: formData.get("dueDate"),
    issueDate: formData.get("issueDate") || formData.get("dueDate"),
    description: formData.get("description"),
    title: formData.get("title"),
    currency,
    paymentTermsDays: Number(formData.get("paymentTermsDays") ?? 14),
    discountMajor: Number(formData.get("discountMajor") ?? 0),
    notes: formData.get("notes") ?? "",
    terms: formData.get("terms") ?? "",
    internalNotes: formData.get("internalNotes") ?? "",
    invoiceNumber: String(formData.get("invoiceNumber") ?? ""),
    autoInvoiceNumber: formData.get("autoInvoiceNumber") !== "false",
    lineItems: legacyLines.data.map((item) => ({
      description: item.name,
      quantity: item.quantity ?? 1,
      unitAmountMajor:
        typeof item.unitAmountMinor === "number"
          ? minorToMajor(item.unitAmountMinor, currency)
          : item.price,
      taxRatePercent: 0,
    })),
  });

  if (!result.ok) {
    return { error: result.error };
  }

  redirect(`/invoice/${result.invoiceId}`);
}

export async function deleteInvoiceAction(formData: FormData): Promise<InvoiceActionResult> {
  const session = await requireSession();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Missing invoice." };
  }

  const result = await prisma.invoice.deleteMany({
    where: ownedInvoiceWhere(session.userId, { id }),
  });
  if (result.count === 0) {
    return { ok: false, error: "Invoice not found." };
  }

  revalidateInvoicePaths(id);
  revalidatePath("/invoice/new");
  return {
    ok: true,
    invoiceId: id,
    revision: 0,
    invoiceNumber: "",
    status: "void",
  };
}

export async function discardInvoiceDraftAction(
  formData: FormData,
): Promise<InvoiceActionResult> {
  const session = await requireSession();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Missing invoice." };
  }

  const invoice = await prisma.invoice.findFirst({
    where: ownedInvoiceWhere(session.userId, { id }),
    select: { status: true },
  });
  if (!invoice) {
    return { ok: false, error: "Invoice not found." };
  }
  if (invoice.status !== "draft") {
    return { ok: false, error: "Only draft invoices can be discarded." };
  }

  await prisma.invoice.deleteMany({
    where: ownedInvoiceWhere(session.userId, { id }),
  });
  revalidateInvoicePaths(id);
  return {
    ok: true,
    invoiceId: id,
    revision: 0,
    invoiceNumber: "",
    status: "draft",
  };
}

export async function duplicateInvoiceAction(
  formData: FormData,
): Promise<InvoiceActionResult> {
  const session = await requireSession();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Missing invoice." };
  }

  const source = await prisma.invoice.findFirst({
    where: ownedInvoiceWhere(session.userId, { id }),
    include: { lineItems: { orderBy: { sortOrder: "asc" } } },
  });
  if (!source) {
    return { ok: false, error: "Invoice not found." };
  }

  try {
    const duplicate = await prisma.$transaction(async (tx) => {
      const issueDate = new Date();
      const invoiceNumber = await allocateInvoiceNumber(
        tx,
        session.userId,
        session.email,
        issueDate,
      );
      const dueDate = dueDateFromTerms(issueDate, 14);

      return tx.invoice.create({
        data: {
          userId: session.userId,
          clientId: source.clientId,
          invoiceNumber,
          title: source.title ? `${source.title} (copy)` : "Invoice copy",
          description: source.description,
          currency: source.currency,
          subtotalMinor: source.subtotalMinor,
          taxMinor: source.taxMinor,
          discountMinor: source.discountMinor,
          totalMinor: source.totalMinor,
          status: "draft",
          issueDate,
          dueDate,
          notes: source.notes,
          terms: source.terms,
          internalNotes: source.internalNotes,
          lineItemsJson: source.lineItemsJson,
          amount: source.amount,
          revision: 1,
          lineItems: {
            create: source.lineItems.map((item, sortOrder) => ({
              description: item.description,
              quantity: item.quantity,
              unitAmountMinor: item.unitAmountMinor,
              taxRateBps: item.taxRateBps,
              subtotalMinor: item.subtotalMinor,
              taxMinor: item.taxMinor,
              totalMinor: item.totalMinor,
              sortOrder,
            })),
          },
          activities: {
            create: {
              actorUserId: session.userId,
              type: "created",
              nextStatus: "draft",
              metadataJson: JSON.stringify({ duplicatedFrom: source.id }),
            },
          },
        },
        select: { id: true, revision: true, invoiceNumber: true, status: true },
      });
    });

    revalidateInvoicePaths(duplicate.id);
    return {
      ok: true,
      invoiceId: duplicate.id,
      revision: duplicate.revision,
      invoiceNumber: duplicate.invoiceNumber,
      status: duplicate.status as BillingInvoiceStatus,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to duplicate invoice.",
    };
  }
}

const statusSchema = z.enum(INVOICE_STATUSES);

const UNDO_WINDOW_MS = 60_000;

export async function setInvoiceStatusAction(
  formData: FormData,
): Promise<InvoiceActionResult> {
  const session = await requireSession();
  const id = formData.get("id");
  const statusRaw = formData.get("status");

  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Missing invoice." };
  }

  const parsed = statusSchema.safeParse(statusRaw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid status." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: ownedInvoiceWhere(session.userId, { id }),
        select: { status: true, revision: true, invoiceNumber: true },
      });
      if (!invoice) {
        return null;
      }

      const previousStatus = invoice.status as BillingInvoiceStatus;
      if (!canTransitionInvoice(previousStatus, parsed.data)) {
        throw new Error(`Invoice cannot transition from ${previousStatus} to ${parsed.data}.`);
      }
      assertInvoiceTransition(previousStatus, parsed.data);

      const updated = await tx.invoice.updateMany({
        where: { ...ownedInvoiceWhere(session.userId, { id }), status: invoice.status },
        data: {
          status: parsed.data,
          revision: { increment: 1 },
          revisedAt: new Date(),
          ...lifecycleTimestamps(previousStatus, parsed.data),
        },
      });
      if (updated.count !== 1) {
        return null;
      }

      await tx.invoiceActivity.create({
        data: {
          invoiceId: id,
          actorUserId: session.userId,
          type: "status_changed",
          previousStatus: invoice.status,
          nextStatus: parsed.data,
        },
      });

      return {
        revision: invoice.revision + 1,
        invoiceNumber: invoice.invoiceNumber,
        status: parsed.data,
        previousStatus,
      };
    });

    if (!result) {
      return { ok: false, error: "Invoice not found or status already changed." };
    }

    revalidateInvoicePaths(id);
    return {
      ok: true,
      invoiceId: id,
      revision: result.revision,
      invoiceNumber: result.invoiceNumber,
      status: result.status,
      previousStatus: result.previousStatus,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to update status.",
    };
  }
}

/**
 * Short-lived inverse for manual paid/unpaid toggles.
 * Only restores the immediately previous payment status within the undo window.
 */
export async function undoInvoicePaymentStatusAction(
  formData: FormData,
): Promise<InvoiceActionResult> {
  const session = await requireSession();
  const id = formData.get("id");
  const expectedCurrentRaw = formData.get("expectedCurrentStatus");
  const restoreRaw = formData.get("restoreStatus");

  if (typeof id !== "string" || !id) {
    return { ok: false, error: "Missing invoice." };
  }

  const expectedCurrent = statusSchema.safeParse(expectedCurrentRaw);
  const restoreStatus = statusSchema.safeParse(restoreRaw);
  if (!expectedCurrent.success || !restoreStatus.success) {
    return { ok: false, error: "Invalid status." };
  }

  const paymentPair =
    (expectedCurrent.data === "paid" && restoreStatus.data === "unpaid") ||
    (expectedCurrent.data === "unpaid" && restoreStatus.data === "paid") ||
    (expectedCurrent.data === "paid" && restoreStatus.data === "sent");

  if (!paymentPair) {
    return { ok: false, error: "Only recent paid/unpaid changes can be undone." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: ownedInvoiceWhere(session.userId, { id }),
        select: { status: true, revision: true, invoiceNumber: true },
      });
      if (!invoice) {
        return null;
      }
      if (invoice.status !== expectedCurrent.data) {
        return { kind: "stale" as const };
      }

      const latestActivity = await tx.invoiceActivity.findFirst({
        where: {
          invoiceId: id,
          actorUserId: session.userId,
          type: "status_changed",
          nextStatus: expectedCurrent.data,
          previousStatus: restoreStatus.data,
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      if (!latestActivity) {
        return { kind: "stale" as const };
      }
      if (Date.now() - latestActivity.createdAt.getTime() > UNDO_WINDOW_MS) {
        return { kind: "expired" as const };
      }

      const previousStatus = invoice.status as BillingInvoiceStatus;
      if (!canTransitionInvoice(previousStatus, restoreStatus.data)) {
        throw new Error(
          `Invoice cannot transition from ${previousStatus} to ${restoreStatus.data}.`,
        );
      }
      assertInvoiceTransition(previousStatus, restoreStatus.data);

      const updated = await tx.invoice.updateMany({
        where: {
          ...ownedInvoiceWhere(session.userId, { id }),
          status: invoice.status,
        },
        data: {
          status: restoreStatus.data,
          revision: { increment: 1 },
          revisedAt: new Date(),
          ...lifecycleTimestamps(previousStatus, restoreStatus.data),
        },
      });
      if (updated.count !== 1) {
        return null;
      }

      await tx.invoiceActivity.create({
        data: {
          invoiceId: id,
          actorUserId: session.userId,
          type: "status_changed",
          previousStatus: invoice.status,
          nextStatus: restoreStatus.data,
          metadataJson: JSON.stringify({ undo: true }),
        },
      });

      return {
        kind: "ok" as const,
        revision: invoice.revision + 1,
        invoiceNumber: invoice.invoiceNumber,
        status: restoreStatus.data,
        previousStatus,
      };
    });

    if (!result) {
      return { ok: false, error: "Invoice not found or status already changed." };
    }
    if (result.kind === "stale") {
      return { ok: false, error: "Nothing to undo — status already changed." };
    }
    if (result.kind === "expired") {
      return { ok: false, error: "Undo window expired." };
    }

    revalidateInvoicePaths(id);
    return {
      ok: true,
      invoiceId: id,
      revision: result.revision,
      invoiceNumber: result.invoiceNumber,
      status: result.status,
      previousStatus: result.previousStatus,
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unable to undo status change.",
    };
  }
}

