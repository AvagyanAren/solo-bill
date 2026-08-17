"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { percentageToBasisPoints } from "@/lib/billing/tax";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";

const CURRENCY_PATTERN = /^[A-Z]{3}$/;

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    message: "Enter a valid email.",
  });

const settingsSchema = z.object({
  legalName: z.string().trim().max(200),
  displayName: z.string().trim().max(200),
  email: optionalEmail,
  phone: z.string().trim().max(50),
  addressLine1: z.string().trim().max(200),
  addressLine2: z.string().trim().max(200),
  city: z.string().trim().max(100),
  state: z.string().trim().max(100),
  postalCode: z.string().trim().max(30),
  countryCode: z.string().trim().max(2),
  defaultCurrency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(CURRENCY_PATTERN, "Currency must be a 3-letter code."),
  locale: z.string().trim().min(2).max(32),
  defaultTaxRatePercent: z.coerce.number().min(0).max(100),
  defaultPaymentTermsDays: z.coerce.number().int().min(0).max(3650),
  invoicePrefix: z
    .string()
    .trim()
    .min(1, "Invoice prefix is required.")
    .max(20)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores."),
  nextInvoiceSequence: z.coerce.number().int().min(1).max(1_000_000_000),
  remindersEnabled: z.boolean(),
  reminderDaysAfterDue: z.coerce.number().int().min(0).max(3650),
  reminderSubject: z.string().trim().max(200),
  reminderBody: z.string().trim().max(8000),
});

export type SettingsFormState = {
  ok?: boolean;
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof settingsSchema>, string>>;
};

function emptyToNull(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed ? trimmed : null;
}

function readSettingsFields(formData: FormData) {
  const remindersRaw = formData.get("remindersEnabled");
  return {
    legalName: String(formData.get("legalName") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    email: String(formData.get("email") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    addressLine1: String(formData.get("addressLine1") ?? ""),
    addressLine2: String(formData.get("addressLine2") ?? ""),
    city: String(formData.get("city") ?? ""),
    state: String(formData.get("state") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    countryCode: String(formData.get("countryCode") ?? "").toUpperCase(),
    defaultCurrency: String(formData.get("defaultCurrency") ?? "USD"),
    locale: String(formData.get("locale") ?? "en-US"),
    defaultTaxRatePercent: formData.get("defaultTaxRatePercent"),
    defaultPaymentTermsDays: formData.get("defaultPaymentTermsDays"),
    invoicePrefix: String(formData.get("invoicePrefix") ?? "INV"),
    nextInvoiceSequence: formData.get("nextInvoiceSequence"),
    remindersEnabled:
      remindersRaw === "on" ||
      remindersRaw === "true" ||
      remindersRaw === "1",
    reminderDaysAfterDue: formData.get("reminderDaysAfterDue"),
    reminderSubject: String(formData.get("reminderSubject") ?? ""),
    reminderBody: String(formData.get("reminderBody") ?? ""),
  };
}

function fieldErrorsFromZod(error: z.ZodError): SettingsFormState {
  const fieldErrors: SettingsFormState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in fieldErrors)) {
      fieldErrors[key as keyof z.infer<typeof settingsSchema>] = issue.message;
    }
  }
  return {
    ok: false,
    error: "Check the fields below.",
    fieldErrors,
  };
}

export async function upsertBusinessSettingsAction(
  _prev: SettingsFormState | undefined,
  formData: FormData,
): Promise<SettingsFormState> {
  const session = await requireSession();
  const parsed = settingsSchema.safeParse(readSettingsFields(formData));
  if (!parsed.success) {
    return fieldErrorsFromZod(parsed.error);
  }

  let defaultTaxRateBps = 0;
  try {
    defaultTaxRateBps = percentageToBasisPoints(parsed.data.defaultTaxRatePercent);
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid tax rate.",
      fieldErrors: { defaultTaxRatePercent: "Enter a tax rate between 0 and 100." },
    };
  }

  const data = {
    legalName: emptyToNull(parsed.data.legalName),
    displayName: emptyToNull(parsed.data.displayName),
    email: emptyToNull(parsed.data.email),
    phone: emptyToNull(parsed.data.phone),
    addressLine1: emptyToNull(parsed.data.addressLine1),
    addressLine2: emptyToNull(parsed.data.addressLine2),
    city: emptyToNull(parsed.data.city),
    state: emptyToNull(parsed.data.state),
    postalCode: emptyToNull(parsed.data.postalCode),
    countryCode: emptyToNull(parsed.data.countryCode),
    defaultCurrency: parsed.data.defaultCurrency,
    locale: parsed.data.locale,
    defaultTaxRateBps,
    defaultPaymentTermsDays: parsed.data.defaultPaymentTermsDays,
    invoicePrefix: parsed.data.invoicePrefix.toUpperCase(),
    nextInvoiceSequence: parsed.data.nextInvoiceSequence,
    remindersEnabled: parsed.data.remindersEnabled,
    reminderDaysAfterDue: parsed.data.reminderDaysAfterDue,
    reminderSubject: emptyToNull(parsed.data.reminderSubject),
    reminderBody: emptyToNull(parsed.data.reminderBody),
  };

  await prisma.businessProfile.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      ...data,
    },
    update: data,
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard");
  revalidatePath("/invoice/new");

  return { ok: true };
}
