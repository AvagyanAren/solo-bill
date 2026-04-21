/**
 * Shared secret for JWT signing (session cookie) and middleware verification.
 */
export function getAuthSecretBytes(): Uint8Array {
  return new TextEncoder().encode(getAuthSecretString());
}

export function getAuthSecretString(): string {
  const fromEnv = process.env.AUTH_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) {
    return fromEnv;
  }
  if (process.env.NODE_ENV === "development") {
    return "dev-insecure-solobill-secret-change-me!!";
  }
  throw new Error("AUTH_SECRET must be set to at least 32 characters in production.");
}
