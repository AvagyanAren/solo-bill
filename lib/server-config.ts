import { isLibsqlConnectionString } from "@/lib/db-url";

/** Returns a user-safe config error for hosted (Vercel) runtime, or null if env looks OK. */
export function getHostedDatabaseConfigError(): string | null {
  if (!process.env.VERCEL) {
    return null;
  }
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw || !isLibsqlConnectionString(raw)) {
    return "Database not configured for production. In Vercel → Settings → Environment Variables set DATABASE_URL to your Turso libsql:// URL, TURSO_AUTH_TOKEN, and AUTH_SECRET (32+ chars), then redeploy.";
  }
  if (!process.env.TURSO_AUTH_TOKEN?.trim()) {
    return "TURSO_AUTH_TOKEN is missing on Vercel. Add it under Environment Variables for Production, then redeploy.";
  }
  return null;
}

export function getProductionAuthConfigError(): string | null {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret || secret.length < 32) {
    return "AUTH_SECRET is missing or too short on Vercel. Set a random string of at least 32 characters under Environment Variables for Production, then redeploy.";
  }
  return null;
}

export function isNextNavigationError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  // Next.js digest-based check when available
  const digest = (error as { digest?: string }).digest;
  if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND"))) {
    return true;
  }
  return error.message === "NEXT_REDIRECT" || error.message === "NEXT_NOT_FOUND";
}

export function toAuthActionErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Vercel: use a remote libSQL database")) {
    return getHostedDatabaseConfigError() ?? "Database is not configured for this deployment.";
  }
  if (message.includes("AUTH_SECRET must be set")) {
    return getProductionAuthConfigError() ?? "Server auth is not configured.";
  }
  if (message.includes("DATABASE_URL is required for libsql")) {
    return "Database URL is not configured.";
  }
  if (
    message.includes("no such table") ||
    message.includes("SQLITE_ERROR") ||
    message.includes("SQLITE_UNKNOWN")
  ) {
    return "Database is not ready yet. Try again in a moment, or contact the site owner.";
  }
  return "Something went wrong. Please try again.";
}
