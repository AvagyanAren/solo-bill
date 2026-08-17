"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { ownedClientWhere } from "@/lib/billing/authorization";
import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";

const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  email: z.string().trim().email("Enter a valid email."),
  companyName: z.string().trim().max(200),
  phone: z.string().trim().max(50),
  billingAddress1: z.string().trim().max(200),
  billingAddress2: z.string().trim().max(200),
  billingCity: z.string().trim().max(100),
  billingState: z.string().trim().max(100),
  billingPostalCode: z.string().trim().max(30),
  billingCountry: z.string().trim().max(100),
  taxId: z.string().trim().max(80),
  notes: z.string().trim().max(4000),
});

export type ClientFormState = {
  error?: string;
  fieldErrors?: Partial<Record<keyof z.infer<typeof clientSchema>, string>>;
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readClientFields(formData: FormData) {
  return {
    name: formData.get("name"),
    email: formData.get("email"),
    companyName: String(formData.get("companyName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    billingAddress1: String(formData.get("billingAddress1") ?? ""),
    billingAddress2: String(formData.get("billingAddress2") ?? ""),
    billingCity: String(formData.get("billingCity") ?? ""),
    billingState: String(formData.get("billingState") ?? ""),
    billingPostalCode: String(formData.get("billingPostalCode") ?? ""),
    billingCountry: String(formData.get("billingCountry") ?? ""),
    taxId: String(formData.get("taxId") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  };
}

function clientDataFromParsed(data: z.infer<typeof clientSchema>) {
  return {
    name: data.name,
    email: data.email,
    companyName: emptyToNull(data.companyName),
    phone: emptyToNull(data.phone),
    billingAddress1: emptyToNull(data.billingAddress1),
    billingAddress2: emptyToNull(data.billingAddress2),
    billingCity: emptyToNull(data.billingCity),
    billingState: emptyToNull(data.billingState),
    billingPostalCode: emptyToNull(data.billingPostalCode),
    billingCountry: emptyToNull(data.billingCountry),
    taxId: emptyToNull(data.taxId),
    notes: emptyToNull(data.notes),
  };
}

export async function createClientAction(
  _prev: ClientFormState | undefined,
  formData: FormData,
): Promise<ClientFormState> {
  const session = await requireSession();
  const parsed = clientSchema.safeParse(readClientFields(formData));
  if (!parsed.success) {
    return fieldErrorsFromZod(parsed.error);
  }
  await prisma.client.create({
    data: {
      ...clientDataFromParsed(parsed.data),
      userId: session.userId,
    },
  });
  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}

export async function updateClientAction(
  _prev: ClientFormState | undefined,
  formData: FormData,
): Promise<ClientFormState> {
  const session = await requireSession();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Missing client." };
  }
  const parsed = clientSchema.safeParse(readClientFields(formData));
  if (!parsed.success) {
    return fieldErrorsFromZod(parsed.error);
  }
  const result = await prisma.client.updateMany({
    where: ownedClientWhere(session.userId, { id }),
    data: clientDataFromParsed(parsed.data),
  });
  if (result.count === 0) {
    return { error: "Client not found or you do not have access." };
  }
  revalidatePath("/dashboard/clients");
  redirect("/dashboard/clients");
}

export async function deleteClientAction(formData: FormData): Promise<void> {
  const session = await requireSession();
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return;
  }
  await prisma.client.deleteMany({
    where: ownedClientWhere(session.userId, { id }),
  });
  revalidatePath("/dashboard/clients");
}

function fieldErrorsFromZod(error: z.ZodError): ClientFormState {
  const fieldErrors: ClientFormState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") {
      fieldErrors[key as keyof z.infer<typeof clientSchema>] = issue.message;
    }
  }
  return {
    error: "Check the fields below.",
    fieldErrors,
  };
}
