import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

describe("billing-domain migration", () => {
  const databases: Database.Database[] = [];

  afterEach(() => {
    for (const database of databases.splice(0)) {
      database.close();
    }
  });

  it("backfills ownership, minor totals, line items, numbering, and activity", () => {
    const database = new Database(":memory:");
    databases.push(database);
    database.exec(`
      PRAGMA foreign_keys=ON;
      CREATE TABLE "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL
      );
      CREATE TABLE "Client" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
      );
      CREATE TABLE "Invoice" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "clientId" TEXT NOT NULL,
        "title" TEXT NOT NULL DEFAULT '',
        "description" TEXT NOT NULL,
        "lineItemsJson" TEXT NOT NULL DEFAULT '[]',
        "amount" REAL NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'unpaid',
        "dueDate" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE
      );
      INSERT INTO "User" VALUES ('user-1', 'owner@example.com', 'hash');
      INSERT INTO "Client" ("id", "name", "email", "userId")
      VALUES ('client-1', 'Acme', 'billing@acme.test', 'user-1');
      INSERT INTO "Invoice" (
        "id", "clientId", "title", "description", "lineItemsJson",
        "amount", "status", "dueDate", "createdAt"
      ) VALUES (
        'invoice-1',
        'client-1',
        'Consulting',
        'August consulting',
        '[{"name":"Design","price":12.34},{"name":"Review","price":5}]',
        17.34,
        'paid',
        '2026-09-01 12:00:00',
        '2026-08-12 12:00:00'
      );
    `);

    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "prisma",
        "migrations",
        "20260812143000_billing_domain",
        "migration.sql",
      ),
      "utf8",
    );
    database.exec(migration);

    expect(
      database
        .prepare(
          `SELECT "userId", "invoiceNumber", "totalMinor", "paidAt"
           FROM "Invoice" WHERE "id" = 'invoice-1'`,
        )
        .get(),
    ).toMatchObject({
      userId: "user-1",
      invoiceNumber: "INV-2026-0001",
      totalMinor: 1734,
    });
    expect(
      database
        .prepare(
          `SELECT "description", "unitAmountMinor", "sortOrder"
           FROM "InvoiceLineItem" ORDER BY "sortOrder"`,
        )
        .all(),
    ).toEqual([
      { description: "Design", unitAmountMinor: 1234, sortOrder: 0 },
      { description: "Review", unitAmountMinor: 500, sortOrder: 1 },
    ]);
    expect(
      database
        .prepare(`SELECT "nextInvoiceSequence" FROM "BusinessProfile"`)
        .get(),
    ).toEqual({ nextInvoiceSequence: 2 });
    expect(
      database.prepare(`SELECT "type" FROM "InvoiceActivity"`).get(),
    ).toEqual({ type: "created" });
    expect(database.pragma("foreign_key_check")).toEqual([]);
  });

  it("keeps unpaid status and synthesizes a line item when JSON is empty", () => {
    const database = new Database(":memory:");
    databases.push(database);
    database.exec(`
      PRAGMA foreign_keys=ON;
      CREATE TABLE "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "email" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL
      );
      CREATE TABLE "Client" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE
      );
      CREATE TABLE "Invoice" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "clientId" TEXT NOT NULL,
        "title" TEXT NOT NULL DEFAULT '',
        "description" TEXT NOT NULL,
        "lineItemsJson" TEXT NOT NULL DEFAULT '[]',
        "amount" REAL NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'unpaid',
        "dueDate" DATETIME NOT NULL,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE
      );
      INSERT INTO "User" VALUES ('user-2', 'owner2@example.com', 'hash');
      INSERT INTO "Client" ("id", "name", "email", "userId")
      VALUES ('client-2', 'Beta', 'billing@beta.test', 'user-2');
      INSERT INTO "Invoice" (
        "id", "clientId", "title", "description", "lineItemsJson",
        "amount", "status", "dueDate", "createdAt"
      ) VALUES (
        'invoice-2',
        'client-2',
        'Retainer',
        'Monthly retainer',
        '[]',
        250,
        'unpaid',
        '2026-09-01 12:00:00',
        '2026-08-01 12:00:00'
      );
    `);

    const migration = fs.readFileSync(
      path.join(
        process.cwd(),
        "prisma",
        "migrations",
        "20260812143000_billing_domain",
        "migration.sql",
      ),
      "utf8",
    );
    database.exec(migration);

    expect(
      database
        .prepare(
          `SELECT "status", "userId", "totalMinor" FROM "Invoice" WHERE "id" = 'invoice-2'`,
        )
        .get(),
    ).toEqual({
      status: "unpaid",
      userId: "user-2",
      totalMinor: 25000,
    });
    expect(
      database
        .prepare(
          `SELECT "description", "unitAmountMinor", "quantity"
           FROM "InvoiceLineItem" WHERE "invoiceId" = 'invoice-2'`,
        )
        .get(),
    ).toEqual({
      description: "Monthly retainer",
      unitAmountMinor: 25000,
      quantity: 1,
    });
  });
});
