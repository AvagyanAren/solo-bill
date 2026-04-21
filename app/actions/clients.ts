"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { requireSession } from "@/lib/require-session";

const clientSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  email: z.string().trim().email("Enter a valid email."),
});

export type ClientFormState = {
  error?: string;
  fieldErrors?: { name?: string; email?: string };
};

function readClientFields(formData: FormData) {
  return {
    name: formData.get("name"),
    email: formData.get("email"),
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
      name: parsed.data.name,
      email: parsed.data.email,
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
    where: { id, userId: session.userId },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
    },
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
    where: { id, userId: session.userId },
  });
  revalidatePath("/dashboard/clients");
}

function fieldErrorsFromZod(error: z.ZodError): ClientFormState {
  const fieldErrors: ClientFormState["fieldErrors"] = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (key === "name" || key === "email") {
      fieldErrors[key] = issue.message;
    }
  }
  return {
    error: "Check the fields below.",
    fieldErrors,
  };
}
