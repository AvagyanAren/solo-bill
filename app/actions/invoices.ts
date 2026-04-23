"use server";

import { loadEnvConfig } from "@next/env";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import {
  generateInvoiceDraftFromText,
  getMockInvoiceDraftForPreview,
  isClientSampleDraftAllowed,
} from "@/lib/openai-invoice";
import { requireSession } from "@/lib/require-session";

const lineItemSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().finite(),
});

const createInvoiceSchema = z.object({
  clientId: z.string().min(1),
  dueDate: z.string().min(1),
  description: z.string().min(1),
  title: z.string().trim().min(1, "Add a title."),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
});

export type CreateInvoiceState = {
  error?: string;
};

export type DraftInvoiceOptions = {
  /** Fill sample line items (no OpenAI). Allowed in development or when `SOLOBILL_MOCK_INVOICE_AI=1`. */
  useSampleLines?: boolean;
};

export async function draftInvoiceFromDescription(
  description: string,
  options: DraftInvoiceOptions = {},
): Promise<
  | { ok: false; error: string }
  | {
      ok: true;
      draft: {
        title: string;
        line_items: { name: string; price: number }[];
        total_amount: number;
      };
    }
> {
  await requireSession();
  // Server actions can run before this module’s top-level `loadEnvConfig` is applied; refresh .env
  // here so `SOLOBILL_MOCK_INVOICE_AI` and the mock branch are always visible.
  loadEnvConfig(process.cwd());
  const trimmed = description.trim();
  if (!trimmed) {
    return { ok: false, error: "Enter what you worked on." };
  }
  if (options.useSampleLines) {
    if (!isClientSampleDraftAllowed()) {
      return {
        ok: false,
        error: "Sample line items are only available in development or when SOLOBILL_MOCK_INVOICE_AI=1.",
      };
    }
    return { ok: true, draft: getMockInvoiceDraftForPreview(trimmed) };
  }
  return generateInvoiceDraftFromText(trimmed);
}

export async function createInvoiceAction(
  _prev: CreateInvoiceState | undefined,
  formData: FormData,
): Promise<CreateInvoiceState> {
  const session = await requireSession();

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

  const itemsArr = z.array(lineItemSchema).min(1).safeParse(lineItemsParsed);
  if (!itemsArr.success) {
    return {
      error: "Add at least one line item with a label and a valid price.",
    };
  }

  const parsed = createInvoiceSchema.safeParse({
    clientId: formData.get("clientId"),
    dueDate: formData.get("dueDate"),
    description: formData.get("description"),
    title: formData.get("title"),
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Check the form.";
    return { error: msg };
  }

  const client = await prisma.client.findFirst({
    where: { id: parsed.data.clientId, userId: session.userId },
  });
  if (!client) {
    return { error: "Client not found." };
  }

  const due = parseDueDate(parsed.data.dueDate);
  if (!due) {
    return { error: "Choose a valid due date." };
  }

  const invoice = await prisma.invoice.create({
    data: {
      clientId: client.id,
      title: parsed.data.title,
      description: parsed.data.description.trim(),
      lineItemsJson: JSON.stringify(itemsArr.data),
      amount: parsed.data.amount,
      dueDate: due,
    },
  });

  revalidatePath("/dashboard");
  redirect(`/invoice/${invoice.id}`);
}

function parseDueDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) {
    return null;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) {
    return null;
  }
  const dt = new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
  if (Number.isNaN(dt.getTime())) {
    return null;
  }
  return dt;
}
