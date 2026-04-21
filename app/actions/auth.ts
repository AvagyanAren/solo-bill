"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession } from "@/lib/session";

const authSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  password: z.string().min(8, "Use at least 8 characters."),
});

export type AuthFormState = {
  error?: string;
};

function normalizeEmail(formData: FormData): string {
  const raw = formData.get("email");
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

export async function registerAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = authSchema.safeParse({
    email: normalizeEmail(formData),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Check your email and password.";
    return { error: msg };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: "An account with this email already exists." };
  }

  const hashed = await hashPassword(parsed.data.password);
  const user = await prisma.user.create({
    data: {
      email: parsed.data.email,
      password: hashed,
    },
  });

  await createSession(user.id, user.email);
  redirect("/dashboard");
}

export async function loginAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = authSchema.safeParse({
    email: normalizeEmail(formData),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Check your email and password.";
    return { error: msg };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user) {
    return { error: "Invalid email or password." };
  }

  const ok = await verifyPassword(parsed.data.password, user.password);
  if (!ok) {
    return { error: "Invalid email or password." };
  }

  await createSession(user.id, user.email);
  redirect("/dashboard");
}
