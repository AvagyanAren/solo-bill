PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- One profile per existing user. Defaults keep this migration safe for accounts
-- that have not completed business settings yet.
CREATE TABLE "BusinessProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "legalName" TEXT,
    "displayName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT,
    "logoUrl" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "locale" TEXT NOT NULL DEFAULT 'en-US',
    "defaultTaxRateBps" INTEGER NOT NULL DEFAULT 0,
    "defaultPaymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "nextInvoiceSequence" INTEGER NOT NULL DEFAULT 1,
    "remindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderDaysAfterDue" INTEGER NOT NULL DEFAULT 7,
    "reminderSubject" TEXT,
    "reminderBody" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BusinessProfile_userId_key" ON "BusinessProfile"("userId");

INSERT INTO "BusinessProfile" (
    "id",
    "userId",
    "email",
    "nextInvoiceSequence"
)
SELECT
    'bp_' || lower(hex(randomblob(12))),
    u."id",
    u."email",
    COALESCE((
        SELECT COUNT(*) + 1
        FROM "Invoice" i
        JOIN "Client" c ON c."id" = i."clientId"
        WHERE c."userId" = u."id"
    ), 1)
FROM "User" u;

-- Client keeps its legacy name/email fields while adding complete billing details.
ALTER TABLE "Client" ADD COLUMN "companyName" TEXT;
ALTER TABLE "Client" ADD COLUMN "contactName" TEXT;
ALTER TABLE "Client" ADD COLUMN "phone" TEXT;
ALTER TABLE "Client" ADD COLUMN "billingAddress1" TEXT;
ALTER TABLE "Client" ADD COLUMN "billingAddress2" TEXT;
ALTER TABLE "Client" ADD COLUMN "billingCity" TEXT;
ALTER TABLE "Client" ADD COLUMN "billingState" TEXT;
ALTER TABLE "Client" ADD COLUMN "billingPostalCode" TEXT;
ALTER TABLE "Client" ADD COLUMN "billingCountry" TEXT;
ALTER TABLE "Client" ADD COLUMN "taxId" TEXT;
ALTER TABLE "Client" ADD COLUMN "preferredCurrency" TEXT;
ALTER TABLE "Client" ADD COLUMN "notes" TEXT;
ALTER TABLE "Client" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Client" ADD COLUMN "createdAt" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';
ALTER TABLE "Client" ADD COLUMN "updatedAt" DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00';

UPDATE "Client"
SET "createdAt" = CURRENT_TIMESTAMP,
    "updatedAt" = CURRENT_TIMESTAMP;

CREATE INDEX "Client_userId_name_idx" ON "Client"("userId", "name");

-- Rebuild Invoice so direct ownership and required normalized totals are present
-- for every existing row. Legacy fields remain during the UI transition.
ALTER TABLE "Invoice" RENAME TO "InvoiceLegacy";

CREATE TABLE "Invoice" (
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
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lineItemsJson" TEXT NOT NULL DEFAULT '[]',
    "amount" REAL NOT NULL,
    CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Invoice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

WITH numbered AS (
    SELECT
        i.*,
        c."userId" AS "ownerId",
        ROW_NUMBER() OVER (
            PARTITION BY c."userId"
            ORDER BY i."createdAt", i."id"
        ) AS "ownerSequence"
    FROM "InvoiceLegacy" i
    JOIN "Client" c ON c."id" = i."clientId"
)
INSERT INTO "Invoice" (
    "id",
    "userId",
    "clientId",
    "invoiceNumber",
    "title",
    "description",
    "currency",
    "subtotalMinor",
    "taxMinor",
    "discountMinor",
    "totalMinor",
    "status",
    "issueDate",
    "dueDate",
    "paidAt",
    "createdAt",
    "updatedAt",
    "lineItemsJson",
    "amount"
)
SELECT
    n."id",
    n."ownerId",
    n."clientId",
    printf('INV-%s-%04d', strftime('%Y', n."createdAt"), n."ownerSequence"),
    n."title",
    n."description",
    'USD',
    CAST(ROUND(n."amount" * 100.0) AS INTEGER),
    0,
    0,
    CAST(ROUND(n."amount" * 100.0) AS INTEGER),
    n."status",
    n."createdAt",
    n."dueDate",
    CASE WHEN n."status" = 'paid' THEN n."createdAt" ELSE NULL END,
    n."createdAt",
    n."createdAt",
    n."lineItemsJson",
    n."amount"
FROM numbered n;

CREATE UNIQUE INDEX "Invoice_userId_invoiceNumber_key" ON "Invoice"("userId", "invoiceNumber");
CREATE INDEX "Invoice_userId_status_dueDate_idx" ON "Invoice"("userId", "status", "dueDate");
CREATE INDEX "Invoice_userId_createdAt_idx" ON "Invoice"("userId", "createdAt");
CREATE INDEX "Invoice_clientId_idx" ON "Invoice"("clientId");

CREATE TABLE "InvoiceLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitAmountMinor" INTEGER NOT NULL,
    "taxRateBps" INTEGER NOT NULL DEFAULT 0,
    "subtotalMinor" INTEGER NOT NULL,
    "taxMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceLineItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "InvoiceLineItem_invoiceId_sortOrder_key" ON "InvoiceLineItem"("invoiceId", "sortOrder");
CREATE INDEX "InvoiceLineItem_invoiceId_idx" ON "InvoiceLineItem"("invoiceId");

-- json_valid protects malformed legacy payloads. A fallback row below ensures
-- invoices with empty/unusable JSON are still fully normalized.
INSERT INTO "InvoiceLineItem" (
    "id",
    "invoiceId",
    "description",
    "quantity",
    "unitAmountMinor",
    "taxRateBps",
    "subtotalMinor",
    "taxMinor",
    "totalMinor",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
SELECT
    'li_' || lower(hex(randomblob(12))),
    i."id",
    trim(json_extract(j.value, '$.name')),
    1,
    CAST(ROUND(json_extract(j.value, '$.price') * 100.0) AS INTEGER),
    0,
    CAST(ROUND(json_extract(j.value, '$.price') * 100.0) AS INTEGER),
    0,
    CAST(ROUND(json_extract(j.value, '$.price') * 100.0) AS INTEGER),
    CAST(j.key AS INTEGER),
    i."createdAt",
    i."updatedAt"
FROM "Invoice" i
JOIN json_each(
    CASE
        WHEN json_valid(i."lineItemsJson") AND json_type(i."lineItemsJson") = 'array'
        THEN i."lineItemsJson"
        ELSE '[]'
    END
) j
WHERE json_type(j.value) = 'object'
  AND typeof(json_extract(j.value, '$.name')) = 'text'
  AND trim(json_extract(j.value, '$.name')) <> ''
  AND typeof(json_extract(j.value, '$.price')) IN ('integer', 'real');

INSERT INTO "InvoiceLineItem" (
    "id",
    "invoiceId",
    "description",
    "quantity",
    "unitAmountMinor",
    "taxRateBps",
    "subtotalMinor",
    "taxMinor",
    "totalMinor",
    "sortOrder",
    "createdAt",
    "updatedAt"
)
SELECT
    'li_' || lower(hex(randomblob(12))),
    i."id",
    COALESCE(NULLIF(trim(i."description"), ''), NULLIF(trim(i."title"), ''), 'Invoice total'),
    1,
    i."totalMinor",
    0,
    i."totalMinor",
    0,
    i."totalMinor",
    0,
    i."createdAt",
    i."updatedAt"
FROM "Invoice" i
WHERE NOT EXISTS (
    SELECT 1 FROM "InvoiceLineItem" li WHERE li."invoiceId" = i."id"
);

CREATE TABLE "InvoiceActivity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "previousStatus" TEXT,
    "nextStatus" TEXT,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InvoiceActivity_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceActivity_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "InvoiceActivity_invoiceId_createdAt_idx" ON "InvoiceActivity"("invoiceId", "createdAt");
CREATE INDEX "InvoiceActivity_actorUserId_createdAt_idx" ON "InvoiceActivity"("actorUserId", "createdAt");

INSERT INTO "InvoiceActivity" (
    "id",
    "invoiceId",
    "actorUserId",
    "type",
    "nextStatus",
    "metadataJson",
    "createdAt"
)
SELECT
    'ia_' || lower(hex(randomblob(12))),
    i."id",
    i."userId",
    'created',
    i."status",
    '{"source":"legacy_backfill"}',
    i."createdAt"
FROM "Invoice" i;

CREATE TABLE "ReminderRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'reminder',
    "channel" TEXT NOT NULL DEFAULT 'email',
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyText" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "idempotencyKey" TEXT NOT NULL,
    "scheduledFor" DATETIME,
    "lockedAt" DATETIME,
    "attemptedAt" DATETIME,
    "sentAt" DATETIME,
    "failedAt" DATETIME,
    "failureReason" TEXT,
    "providerMessageId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReminderRun_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReminderRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ReminderRun_idempotencyKey_key" ON "ReminderRun"("idempotencyKey");
CREATE INDEX "ReminderRun_userId_status_scheduledFor_idx" ON "ReminderRun"("userId", "status", "scheduledFor");
CREATE INDEX "ReminderRun_invoiceId_createdAt_idx" ON "ReminderRun"("invoiceId", "createdAt");

DROP TABLE "InvoiceLegacy";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
