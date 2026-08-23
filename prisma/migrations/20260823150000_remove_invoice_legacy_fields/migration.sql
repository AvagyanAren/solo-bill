-- Drop temporary invoice compatibility columns now that InvoiceLineItem + minor units are canonical.
-- SQLite 3.35+ supports DROP COLUMN; Prisma migrate targets the same SQLite version locally and on Turso.

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "subtotalMinor" INTEGER NOT NULL DEFAULT 0,
    "taxMinor" INTEGER NOT NULL DEFAULT 0,
    "discountMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "issueDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" DATETIME NOT NULL,
    "sentAt" DATETIME,
    "paidAt" DATETIME,
    "voidedAt" DATETIME,
    "notes" TEXT,
    "terms" TEXT,
    "internalNotes" TEXT,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "revisedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_Invoice" (
    "id", "userId", "clientId", "invoiceNumber", "title", "description", "currency",
    "subtotalMinor", "taxMinor", "discountMinor", "totalMinor", "status", "issueDate", "dueDate",
    "sentAt", "paidAt", "voidedAt", "notes", "terms", "internalNotes", "revision", "revisedAt",
    "createdAt", "updatedAt"
)
SELECT
    "id", "userId", "clientId", "invoiceNumber", "title", "description", "currency",
    "subtotalMinor", "taxMinor", "discountMinor", "totalMinor", "status", "issueDate", "dueDate",
    "sentAt", "paidAt", "voidedAt", "notes", "terms", "internalNotes", "revision", "revisedAt",
    "createdAt", "updatedAt"
FROM "Invoice";

DROP TABLE "Invoice";
ALTER TABLE "new_Invoice" RENAME TO "Invoice";

CREATE UNIQUE INDEX "Invoice_userId_invoiceNumber_key" ON "Invoice"("userId", "invoiceNumber");
CREATE INDEX "Invoice_userId_status_dueDate_idx" ON "Invoice"("userId", "status", "dueDate");
CREATE INDEX "Invoice_userId_createdAt_idx" ON "Invoice"("userId", "createdAt");
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

PRAGMA foreign_keys=ON;
