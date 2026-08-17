# SoloBill

AI-assisted invoicing for freelancers — clients, invoice editor, PDF export, payment tracking, and local mock email delivery.

## Getting started

```bash
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Rebuild native SQLite bindings, then start Next.js |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm test` | Unit tests (Vitest) |
| `npm run e2e` | Playwright end-to-end |

## Phase 5 — PDF, mock email, manual reminders

### PDF export

- Authenticated route: `GET /api/invoices/[id]/pdf`
- Uses a Node-safe **pdfkit** renderer (`lib/pdf/invoice-pdf.ts`)
- Requires a session; ownership is checked via `requireSession` + `ownedInvoiceWhere`
- On download, an `InvoiceActivity` of type `pdf_generated` is recorded

From the invoice detail page, use **Download PDF**.

### Mock email delivery

SoloBill Phase 5 **never** calls external email APIs (no Resend/SendGrid/SMTP).

Delivery goes through `lib/email`:

- `getEmailAdapter()` resolves the adapter
- `SOLOBILL_MOCK_EMAIL=1` forces the mock outbox (documented default for local/CI)
- If unset, the mock adapter is still used (safe default until a real provider is wired)

Each send:

1. Creates a `ReminderRun` (recipient, subject, body, timestamps, status, failure reason)
2. Records matching `InvoiceActivity` (`email_*` / `reminder_*`)
3. On successful **Send invoice**, sets `sentAt` and moves **draft → sent** when applicable

### Manual reminders

- **Send reminder** is available for **unpaid** invoices and **overdue** `sent` invoices
- Uses the same mock adapter and `ReminderRun` / activity outbox history
- Future: a scheduler can enqueue `ReminderRun` rows and call the same adapter boundary; a live provider can replace the mock without changing the UI/actions

### Environment

See `.env.example` for `SOLOBILL_MOCK_EMAIL` and related flags.

## Deploy notes

- Local: SQLite via `DATABASE_URL="file:./dev.db"`
- Vercel / Turso: set `DATABASE_URL` (libsql), `TURSO_AUTH_TOKEN`, and `AUTH_SECRET` (32+ chars)
