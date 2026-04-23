import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@/app/generated/prisma/client";

const require = createRequire(import.meta.url);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Remote libSQL (Turso, etc.) — use on Vercel. Local `file:` DB uses better-sqlite3 (lazy-loaded).
 * Set `DATABASE_URL=libsql://...` and `TURSO_AUTH_TOKEN` in the host env.
 */
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

/**
 * Resolve `DATABASE_URL` to an absolute path. Default uses `dev.db` next to package.json.
 * The Prisma adapter strips a leading `file:` only — do not pass `file:///C:/...` URLs on Windows.
 */
function resolveDatabaseFilePath(rawEnv: string | undefined): string {
  const fallback = "file:./dev.db";
  const trimmed = (rawEnv ?? fallback).trim().replace(/^["']|["']$/g, "");

  if (trimmed === "file:./dev.db" || trimmed === "file:dev.db") {
    return path.join(process.cwd(), "dev.db");
  }

  let absolute: string;

  if (trimmed.startsWith("file:")) {
    const afterProtocol = trimmed.slice("file:".length);
    if (afterProtocol.startsWith("//")) {
      try {
        absolute = path.normalize(fileURLToPath(trimmed));
      } catch {
        const tail = afterProtocol.replace(/^\/+/, "");
        absolute = path.normalize(path.resolve(process.cwd(), tail || "dev.db"));
      }
    } else {
      const relative = afterProtocol.replace(/^\.\//, "") || "dev.db";
      absolute = path.isAbsolute(relative)
        ? path.normalize(relative)
        : path.normalize(path.resolve(process.cwd(), relative));
    }
  } else {
    absolute = path.normalize(path.resolve(process.cwd(), trimmed || "dev.db"));
  }

  const cwd = path.normalize(process.cwd());
  try {
    if (fs.existsSync(absolute) && fs.statSync(absolute).isDirectory()) {
      absolute = path.join(absolute, "dev.db");
    }
  } catch {
    /* ignore */
  }
  if (absolute === cwd || absolute.endsWith(path.sep)) {
    absolute = path.join(cwd, "dev.db");
  }

  return absolute;
}

function ensureDbParentDir(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

/** Probes better-sqlite3 so NODE_MODULE_VERSION mismatches fail at init with a clear message. */
function assertBetterSqliteForCurrentNode(absolutePath: string, Database: new (path: string) => { close: () => void }) {
  const db = new Database(absolutePath);
  db.close();
}

function formatSqliteError(absolutePath: string, e: unknown): Error {
  const base = e instanceof Error ? e.message : String(e);
  const parts = [
    `SQLite / better-sqlite3 could not open "${absolutePath}" (cwd="${process.cwd()}", node=${process.version}): ${base}`,
  ];
  if (base.includes("NODE_MODULE_VERSION") || base.includes("was compiled against a different Node.js version")) {
    parts.push(
      "Native module mismatch: install and run with one Node version only. From the project folder: nvm use (see .nvmrc) OR align Node, then: npm run rebuild:native",
    );
  }
  return new Error(parts.join(" "));
}

function createLibsqlPrismaClient(): PrismaClient {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL is required for libsql:// connections.");
  }
  const token = process.env["TURSO_AUTH_TOKEN"]?.trim();
  const adapter = new PrismaLibSql({
    url,
    authToken: token,
  });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function createFileSqlitePrismaClient(): PrismaClient {
  // Lazy `require` so Vercel + Turso never loads the native `better-sqlite3` binary.
  const Database = require("better-sqlite3") as new (path: string) => { close: () => void };
  const { PrismaBetterSqlite3 } = require("@prisma/adapter-better-sqlite3") as typeof import(
    "@prisma/adapter-better-sqlite3"
  );

  const absolutePath = resolveDatabaseFilePath(process.env.DATABASE_URL);

  try {
    ensureDbParentDir(absolutePath);
    assertBetterSqliteForCurrentNode(absolutePath, Database);
  } catch (e) {
    throw formatSqliteError(absolutePath, e);
  }

  const adapter = new PrismaBetterSqlite3({
    url: absolutePath,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function createPrismaClient(): PrismaClient {
  if (isLibsqlConnectionString(process.env.DATABASE_URL)) {
    return createLibsqlPrismaClient();
  }
  if (process.env.VERCEL) {
    throw new Error(
      "Vercel: use a remote libSQL database. Set DATABASE_URL=libsql://... and TURSO_AUTH_TOKEN in the Vercel project. Then run `npx prisma db push` against that URL. See .env.example.",
    );
  }
  return createFileSqlitePrismaClient();
}

// Reuse one client per server instance (important for Vercel + remote libSQL).
export const prisma = (globalForPrisma.prisma ??= createPrismaClient());
