/**
 * Shared DATABASE_URL classification for local SQLite vs remote libSQL (Turso).
 */

export type DatabaseUrlKind = "missing" | "libsql" | "file" | "other";

export function isLibsqlConnectionString(raw: string | undefined): boolean {
  if (!raw?.trim()) {
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

export function databaseUrlKind(raw: string | undefined): DatabaseUrlKind {
  if (!raw?.trim()) {
    return "missing";
  }
  const t = raw.trim();
  if (isLibsqlConnectionString(t)) {
    return "libsql";
  }
  if (t.startsWith("file:")) {
    return "file";
  }
  return "other";
}
