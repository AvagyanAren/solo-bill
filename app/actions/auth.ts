"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { debugErrorMessage, debugLog } from "@/lib/debug-log";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { ensureRemoteDatabaseReady } from "@/lib/remote-setup";
import {
  getHostedDatabaseConfigError,
  getProductionAuthConfigError,
  isNextNavigationError,
  toAuthActionErrorMessage,
} from "@/lib/server-config";
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
  const configError = getHostedDatabaseConfigError() ?? getProductionAuthConfigError();
  if (configError) {
    return { error: configError };
  }

  try {
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
  } catch (error) {
    if (isNextNavigationError(error)) {
      throw error;
    }
    console.error("[registerAction] error:", error);
    return { error: toAuthActionErrorMessage(error) };
  }
}

export async function loginAction(
  _prev: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const email = normalizeEmail(formData);
  debugLog("A", "app/actions/auth.ts:loginAction", "login action started", {
    hasEmail: Boolean(email),
    vercel: Boolean(process.env.VERCEL),
    nodeEnv: process.env.NODE_ENV ?? null,
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasTursoToken: Boolean(process.env.TURSO_AUTH_TOKEN?.trim()),
    hasAuthSecret: Boolean(process.env.AUTH_SECRET?.trim()),
    authSecretLength: process.env.AUTH_SECRET?.trim().length ?? 0,
  });

  const configError = getHostedDatabaseConfigError() ?? getProductionAuthConfigError();
  if (configError) {
    debugLog("A", "app/actions/auth.ts:loginAction", "hosted config validation failed", {
      message: configError,
    });
    return { error: configError };
  }

  try {
    const parsed = authSchema.safeParse({
      email,
      password: formData.get("password"),
    });
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Check your email and password.";
      debugLog("E", "app/actions/auth.ts:loginAction", "validation failed", { message: msg });
      return { error: msg };
    }

    debugLog("B", "app/actions/auth.ts:loginAction", "before prisma.user.findUnique", {
      emailDomain: parsed.data.email.split("@")[1] ?? null,
    });
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });
    } catch (dbError) {
      if (await ensureRemoteDatabaseReady(dbError)) {
        user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
      } else {
        throw dbError;
      }
    }
    debugLog("B", "app/actions/auth.ts:loginAction", "after prisma.user.findUnique", {
      userFound: Boolean(user),
    });
    if (!user) {
      return { error: "Invalid email or password." };
    }

    const ok = await verifyPassword(parsed.data.password, user.password);
    debugLog("C", "app/actions/auth.ts:loginAction", "password verified", { ok });
    if (!ok) {
      return { error: "Invalid email or password." };
    }

    debugLog("C", "app/actions/auth.ts:loginAction", "before createSession", {});
    await createSession(user.id, user.email);
    debugLog("C", "app/actions/auth.ts:loginAction", "after createSession", {});
    redirect("/dashboard");
  } catch (error) {
    if (isNextNavigationError(error)) {
      throw error;
    }
    debugLog("D", "app/actions/auth.ts:loginAction", "login action threw", {
      error: debugErrorMessage(error),
      errorName: error instanceof Error ? error.name : typeof error,
    });
    console.error("[loginAction] error:", error);
    return { error: toAuthActionErrorMessage(error) };
  }
}
