function isLibsqlConnectionString(raw: string | undefined): boolean {
  if (!raw) {
    return false;
  }
  const t = raw.trim();
  if (t.startsWith("libsql://")) {
    return true;
  }
  if (t.startsWith("wss://") || t.startsWith("https://")) {
    return t.includes("libsql");
  }
  return false;
}

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
  return error.message === "NEXT_REDIRECT" || error.message === "NEXT_NOT_FOUND";
}

export function toAuthActionErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Vercel: use a remote libSQL database")) {
    return getHostedDatabaseConfigError() ?? message;
  }
  if (message.includes("AUTH_SECRET must be set")) {
    return getProductionAuthConfigError() ?? message;
  }
  if (message.includes("DATABASE_URL is required for libsql")) {
    return "DATABASE_URL is not set for the libSQL connection.";
  }
  if (message.includes("no such table") || message.includes("SQLITE_ERROR")) {
    return "Database schema is missing on Turso. Run `npx prisma db push` with your Turso DATABASE_URL and TURSO_AUTH_TOKEN, then try again.";
  }
  return "Sign-in failed due to a server error. Check Vercel env (DATABASE_URL, TURSO_AUTH_TOKEN, AUTH_SECRET) and Runtime Logs.";
}
