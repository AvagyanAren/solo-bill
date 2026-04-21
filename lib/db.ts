import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

/**
 * Resolve `DATABASE_URL` to an absolute path. Prefers a simple `join(cwd, "dev.db")` for the
 * default so behaviour matches Prisma CLI and avoids subtle URL parsing bugs on Windows.
 *
 * The Prisma adapter does `url.replace(/^file:/, "")` — never pass `file:///C:/...` URLs.
 */
function resolveDatabaseFilePath(rawEnv: string | undefined): string {
  const fallback = "file:./dev.db";
  const trimmed = (rawEnv ?? fallback).trim().replace(/^["']|["']$/g, "");

  // Fast path: default SQLite URL used everywhere → one unambiguous file next to package.json
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

/** Create parent dirs, then open/close once so the file exists and the path is valid before Prisma. */
function prepareSqliteFile(filePath: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const db = new Database(filePath);
  db.close();
}

function createPrismaClient() {
  const absolutePath = resolveDatabaseFilePath(process.env.DATABASE_URL);

  try {
    prepareSqliteFile(absolutePath);
  } catch (e) {
    throw new Error(
      `SQLite could not open "${absolutePath}" (cwd="${process.cwd()}"): ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  // Use the same native path string Node/sqlite3 expects on Windows (backslashes OK).
  const adapter = new PrismaBetterSqlite3({
    url: absolutePath,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
