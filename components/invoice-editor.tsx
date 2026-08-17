"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import {
  discardInvoiceDraftAction,
  draftInvoiceFromDescription,
  finalizeInvoiceAction,
  saveInvoiceDraftAction,
  updateInvoiceAction,
  type InvoiceActionResult,
} from "@/app/actions/invoices";
import { DueDatePicker } from "@/components/due-date-picker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addCalendarDays, dueDateFromTerms, parseDateInput } from "@/lib/billing/dates";
import {
  calculateInvoiceTotals,
  calculateLineTotals,
  majorToMinor,
  minorToMajor,
} from "@/lib/billing/money";
import { percentageToBasisPoints } from "@/lib/billing/tax";
import { formatMinorMoney } from "@/lib/format";
import type { BillingInvoiceStatus } from "@/lib/billing/lifecycle";
import { cx } from "@/lib/utils/cx";

export type InvoiceClientOption = {
  id: string;
  name: string;
  email: string;
  preferredCurrency?: string | null;
};

export type InvoiceEditorLine = {
  description: string;
  quantity: string;
  unitAmount: string;
  taxRatePercent: string;
};

export type InvoiceEditorInitial = {
  id?: string;
  revision?: number;
  status?: BillingInvoiceStatus;
  clientId: string;
  title: string;
  description: string;
  currency: string;
  invoiceNumber: string;
  autoInvoiceNumber: boolean;
  issueDate: string;
  dueDate: string;
  paymentTermsDays: number;
  discountMajor: string;
  notes: string;
  terms: string;
  internalNotes: string;
  lines: InvoiceEditorLine[];
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const CURRENCY_OPTIONS = [
  { label: "USD — US Dollar", value: "USD" },
  { label: "EUR — Euro", value: "EUR" },
  { label: "GBP — British Pound", value: "GBP" },
  { label: "CAD — Canadian Dollar", value: "CAD" },
  { label: "AUD — Australian Dollar", value: "AUD" },
];

const PAYMENT_TERM_OPTIONS = [
  { label: "Due on receipt", value: "0" },
  { label: "Net 7", value: "7" },
  { label: "Net 14", value: "14" },
  { label: "Net 30", value: "30" },
  { label: "Net 45", value: "45" },
  { label: "Net 60", value: "60" },
];

function toDateInputValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function defaultIssueDate(): string {
  return toDateInputValue(new Date());
}

function defaultDueDate(termsDays = 14): string {
  return toDateInputValue(addCalendarDays(new Date(), termsDays));
}

function emptyLine(): InvoiceEditorLine {
  return { description: "", quantity: "1", unitAmount: "", taxRatePercent: "0" };
}

function buildPayload(state: {
  id?: string;
  revision: number;
  clientId: string;
  title: string;
  description: string;
  currency: string;
  invoiceNumber: string;
  autoInvoiceNumber: boolean;
  issueDate: string;
  dueDate: string;
  paymentTermsDays: number;
  discountMajor: string;
  notes: string;
  terms: string;
  internalNotes: string;
  lines: InvoiceEditorLine[];
}) {
  return {
    id: state.id,
    revision: state.id ? state.revision : undefined,
    clientId: state.clientId,
    title: state.title,
    description: state.description,
    currency: state.currency,
    invoiceNumber: state.autoInvoiceNumber ? "" : state.invoiceNumber,
    autoInvoiceNumber: state.autoInvoiceNumber,
    issueDate: state.issueDate,
    dueDate: state.dueDate,
    paymentTermsDays: state.paymentTermsDays,
    discountMajor: Number(state.discountMajor || 0),
    notes: state.notes,
    terms: state.terms,
    internalNotes: state.internalNotes,
    lineItems: state.lines
      .map((line) => ({
        description: line.description.trim(),
        quantity: Number(line.quantity),
        unitAmountMajor: Number(line.unitAmount),
        taxRatePercent: Number(line.taxRatePercent || 0),
      }))
      .filter(
        (line) =>
          line.description.length > 0 &&
          Number.isFinite(line.quantity) &&
          line.quantity > 0 &&
          Number.isFinite(line.unitAmountMajor),
      ),
  };
}

export function InvoiceEditor({
  clients,
  initial,
  mode,
  mockInvoiceAi = false,
  devDefaultsToSample = false,
  defaultPaymentTermsDays = 14,
  defaultCurrency = "USD",
}: {
  clients: InvoiceClientOption[];
  initial?: Partial<InvoiceEditorInitial>;
  mode: "create" | "edit";
  mockInvoiceAi?: boolean;
  devDefaultsToSample?: boolean;
  defaultPaymentTermsDays?: number;
  defaultCurrency?: string;
}) {
  const router = useRouter();
  const isEdit = mode === "edit" || Boolean(initial?.id);
  const [step, setStep] = useState<1 | 2>(isEdit ? 2 : 1);

  const [invoiceId, setInvoiceId] = useState(initial?.id);
  const [revision, setRevision] = useState(initial?.revision ?? 1);
  const [status, setStatus] = useState<BillingInvoiceStatus>(initial?.status ?? "draft");

  const [clientId, setClientId] = useState(initial?.clientId ?? clients[0]?.id ?? "");
  const [paymentTermsDays, setPaymentTermsDays] = useState(
    initial?.paymentTermsDays ?? defaultPaymentTermsDays,
  );
  const [issueDate, setIssueDate] = useState(initial?.issueDate ?? defaultIssueDate());
  const [dueDate, setDueDate] = useState(
    initial?.dueDate ?? defaultDueDate(initial?.paymentTermsDays ?? defaultPaymentTermsDays),
  );
  const [workDescription, setWorkDescription] = useState(initial?.description ?? "");
  const [useSampleLines, setUseSampleLines] = useState(
    () => mockInvoiceAi || devDefaultsToSample,
  );
  const [genError, setGenError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [currency, setCurrency] = useState(
    initial?.currency ??
      clients.find((c) => c.id === (initial?.clientId ?? clients[0]?.id))?.preferredCurrency ??
      defaultCurrency,
  );
  const [autoInvoiceNumber, setAutoInvoiceNumber] = useState(
    initial?.autoInvoiceNumber ?? !initial?.invoiceNumber,
  );
  const [invoiceNumber, setInvoiceNumber] = useState(initial?.invoiceNumber ?? "");
  const [discountMajor, setDiscountMajor] = useState(initial?.discountMajor ?? "0");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [terms, setTerms] = useState(initial?.terms ?? "");
  const [internalNotes, setInternalNotes] = useState(initial?.internalNotes ?? "");
  const [lines, setLines] = useState<InvoiceEditorLine[]>(
    initial?.lines?.length ? initial.lines : [emptyLine()],
  );

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const saveRequestId = useRef(0);
  const hydrated = useRef(false);
  const allowAutosave = status === "draft" || !invoiceId;

  const previewTotals = useMemo(() => {
    try {
      const normalized = lines
        .map((line) => {
          const quantity = Number(line.quantity);
          const unitMajor = Number(line.unitAmount);
          const taxPercent = Number(line.taxRatePercent || 0);
          if (
            !line.description.trim() ||
            !Number.isFinite(quantity) ||
            quantity <= 0 ||
            !Number.isFinite(unitMajor)
          ) {
            return null;
          }
          return calculateLineTotals({
            quantity,
            unitAmountMinor: majorToMinor(unitMajor, currency),
            taxRateBps: percentageToBasisPoints(Number.isFinite(taxPercent) ? taxPercent : 0),
          });
        })
        .filter((row): row is NonNullable<typeof row> => row !== null);
      const discount = Number(discountMajor || 0);
      return calculateInvoiceTotals(
        normalized,
        Number.isFinite(discount) ? majorToMinor(discount, currency) : 0,
      );
    } catch {
      return null;
    }
  }, [lines, discountMajor, currency]);

  const editorSnapshot = useMemo(
    () => ({
      id: invoiceId,
      revision,
      clientId,
      title,
      description: workDescription,
      currency,
      invoiceNumber,
      autoInvoiceNumber,
      issueDate,
      dueDate,
      paymentTermsDays,
      discountMajor,
      notes,
      terms,
      internalNotes,
      lines,
    }),
    [
      invoiceId,
      revision,
      clientId,
      title,
      workDescription,
      currency,
      invoiceNumber,
      autoInvoiceNumber,
      issueDate,
      dueDate,
      paymentTermsDays,
      discountMajor,
      notes,
      terms,
      internalNotes,
      lines,
    ],
  );

  const runAutosave = useEffectEvent(async (snapshot: typeof editorSnapshot) => {
    if (!allowAutosave || step !== 2) {
      return;
    }
    if (!snapshot.clientId || !snapshot.title.trim() || !snapshot.description.trim()) {
      return;
    }
    const payload = buildPayload(snapshot);
    if (payload.lineItems.length === 0) {
      return;
    }

    const requestId = ++saveRequestId.current;
    setSaveStatus("saving");
    setSaveError(null);
    const result = await saveInvoiceDraftAction(payload);
    if (requestId !== saveRequestId.current) {
      return;
    }
    applySaveResult(result, "autosave");
  });

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    if (!allowAutosave || step !== 2) {
      return;
    }
    const timer = window.setTimeout(() => {
      void runAutosave(editorSnapshot);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [editorSnapshot, allowAutosave, step]);

  function applySaveResult(result: InvoiceActionResult, source: "autosave" | "manual") {
    if (!result.ok) {
      setSaveStatus("error");
      setSaveError(result.error);
      if (source === "manual") {
        setActionError(result.error);
      }
      return;
    }
    const createdNew = !invoiceId && Boolean(result.invoiceId);
    setInvoiceId(result.invoiceId);
    setRevision(result.revision);
    setStatus(result.status);
    setInvoiceNumber((current) => (autoInvoiceNumber ? result.invoiceNumber : current || result.invoiceNumber));
    setSaveStatus("saved");
    setSaveError(null);
    setActionError(null);
    if (createdNew && result.status === "draft") {
      router.replace(`/invoice/${result.invoiceId}/edit`);
    }
  }

  async function handleGenerate() {
    setGenError(null);
    setGenerating(true);
    try {
      const result = await draftInvoiceFromDescription(workDescription, {
        useSampleLines,
      });
      if (!result.ok) {
        setGenError(result.error);
        return;
      }
      setTitle(result.draft.title);
      setLines(
        result.draft.line_items.length > 0
          ? result.draft.line_items.map((row) => ({
              description: row.name,
              quantity: String(row.quantity),
              unitAmount: String(minorToMajor(row.unitAmountMinor, currency)),
              taxRatePercent: "0",
            }))
          : [emptyLine()],
      );
      setStep(2);
    } finally {
      setGenerating(false);
    }
  }

  function updateLine(index: number, patch: Partial<InvoiceEditorLine>) {
    setLines((current) => {
      const next = [...current];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function syncDueDateFromTerms(nextIssue: string, termsDays: number) {
    const parsed = parseDateInput(nextIssue);
    if (!parsed) {
      return;
    }
    try {
      setDueDate(toDateInputValue(dueDateFromTerms(parsed, termsDays)));
    } catch {
      /* ignore invalid terms */
    }
  }

  function handleFinalize() {
    setActionError(null);
    startTransition(() => {
      void (async () => {
        const requestId = ++saveRequestId.current;
        setSaveStatus("saving");
        const result = await finalizeInvoiceAction(buildPayload(editorSnapshot));
        if (requestId !== saveRequestId.current) {
          return;
        }
        if (!result.ok) {
          applySaveResult(result, "manual");
          return;
        }
        applySaveResult(result, "manual");
        router.push(`/invoice/${result.invoiceId}`);
        router.refresh();
      })();
    });
  }

  function handleUpdate() {
    setActionError(null);
    startTransition(() => {
      void (async () => {
        const requestId = ++saveRequestId.current;
        setSaveStatus("saving");
        const result = await updateInvoiceAction(buildPayload(editorSnapshot));
        if (requestId !== saveRequestId.current) {
          return;
        }
        applySaveResult(result, "manual");
        if (result.ok) {
          router.push(`/invoice/${result.invoiceId}`);
          router.refresh();
        }
      })();
    });
  }

  function handleDiscard() {
    if (!invoiceId) {
      router.push("/dashboard/invoices");
      return;
    }
    startTransition(() => {
      void (async () => {
        const formData = new FormData();
        formData.set("id", invoiceId);
        const result = await discardInvoiceDraftAction(formData);
        if (!result.ok) {
          setActionError(result.error);
          return;
        }
        router.push("/dashboard/invoices");
        router.refresh();
      })();
    });
  }

  const saveLabel =
    saveStatus === "saving"
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save error"
          : "Not saved";

  if (step === 1) {
    return (
      <div className="mx-auto grid max-w-2xl gap-6">
        {mockInvoiceAi ? (
          <p className="text-xs text-tertiary">
            You are in <span className="font-medium">mock / preview</span> mode: sample line items
            are preferred — Generate uses fixed sample amounts, not OpenAI.
          </p>
        ) : null}

        <Checkbox
          size="md"
          isSelected={useSampleLines}
          onChange={setUseSampleLines}
          label="Use sample line items"
          hint="Skip OpenAI and preview the flow with a valid-looking draft (no API key needed in development)."
        />

        <NativeSelect
          label="Client"
          value={clientId}
          required
          options={clients.map((client) => ({
            value: client.id,
            label: `${client.name} (${client.email})`,
          }))}
          onChange={(event) => {
            const nextId = event.target.value;
            setClientId(nextId);
            const preferred = clients.find((client) => client.id === nextId)?.preferredCurrency;
            if (preferred) {
              setCurrency(preferred);
            }
          }}
          selectClassName="min-h-11"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <DueDatePicker
            id="issueDate"
            label="Issue date"
            value={issueDate}
            onChange={(value) => {
              setIssueDate(value);
              syncDueDateFromTerms(value, paymentTermsDays);
            }}
            required
          />
          <NativeSelect
            label="Payment terms"
            value={String(paymentTermsDays)}
            options={PAYMENT_TERM_OPTIONS}
            onChange={(event) => {
              const days = Number(event.target.value);
              setPaymentTermsDays(days);
              syncDueDateFromTerms(issueDate, days);
            }}
            selectClassName="min-h-11"
          />
        </div>

        <DueDatePicker id="dueDate" value={dueDate} onChange={setDueDate} required />

        <Textarea
          label="What did you do?"
          value={workDescription}
          onChange={setWorkDescription}
          placeholder="Example: Landing page design, 3 screens, two revision rounds."
          textAreaClassName="min-h-32"
          isRequired
        />

        {genError ? (
          <p
            role="alert"
            className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary ring-1 ring-error_subtle ring-inset"
          >
            {genError}
          </p>
        ) : null}

        <Button
          type="button"
          className="min-h-11"
          onClick={() => void handleGenerate()}
          disabled={generating || !workDescription.trim() || !clientId}
        >
          {generating ? "Generating…" : "Generate invoice"}
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {!isEdit ? (
          <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => setStep(1)}>
            ← Edit description
          </Button>
        ) : (
          <span className="text-sm text-tertiary">Editing invoice</span>
        )}
        <p
          className={cx(
            "text-sm",
            saveStatus === "error" ? "text-error-primary" : "text-tertiary",
          )}
          role="status"
          aria-live="polite"
        >
          {allowAutosave ? saveLabel : null}
          {saveError ? ` — ${saveError}` : null}
        </p>
      </div>

      <Input label="Invoice title" value={title} onChange={setTitle} isRequired />

      <div className="grid gap-4 sm:grid-cols-2">
        <NativeSelect
          label="Client"
          value={clientId}
          required
          options={clients.map((client) => ({
            value: client.id,
            label: `${client.name} (${client.email})`,
          }))}
          onChange={(event) => setClientId(event.target.value)}
          selectClassName="min-h-11"
        />
        <NativeSelect
          label="Currency"
          value={currency}
          options={CURRENCY_OPTIONS}
          onChange={(event) => setCurrency(event.target.value)}
          selectClassName="min-h-11"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Checkbox
            isSelected={autoInvoiceNumber}
            onChange={(selected) => setAutoInvoiceNumber(selected)}
            label="Auto invoice number"
            hint="Turn off to enter a custom number."
          />
          <Input
            label="Invoice number"
            value={invoiceNumber}
            onChange={setInvoiceNumber}
            isDisabled={autoInvoiceNumber}
            placeholder={autoInvoiceNumber ? "Assigned on save" : "INV-2026-0001"}
          />
        </div>
        <NativeSelect
          label="Payment terms"
          value={String(paymentTermsDays)}
          options={PAYMENT_TERM_OPTIONS}
          onChange={(event) => {
            const days = Number(event.target.value);
            setPaymentTermsDays(days);
            syncDueDateFromTerms(issueDate, days);
          }}
          selectClassName="min-h-11"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <DueDatePicker
          id="editor-issue-date"
          label="Issue date"
          value={issueDate}
          onChange={(value) => {
            setIssueDate(value);
            syncDueDateFromTerms(value, paymentTermsDays);
          }}
          required
        />
        <DueDatePicker id="editor-due-date" value={dueDate} onChange={setDueDate} required />
      </div>

      <Textarea
        label="Work description"
        value={workDescription}
        onChange={setWorkDescription}
        textAreaClassName="min-h-24"
        isRequired
      />

      <div className="grid gap-3">
        <Label>Line items</Label>
        <div className="grid gap-4">
          {lines.map((row, index) => (
            <div
              key={index}
              className="grid gap-3 rounded-xl border border-secondary p-3 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,0.7fr))_auto]"
            >
              <Input
                label={index === 0 ? "Description" : undefined}
                placeholder="Service or item"
                value={row.description}
                onChange={(description) => updateLine(index, { description })}
                aria-label={`Line ${index + 1} description`}
              />
              <Input
                label={index === 0 ? "Qty" : undefined}
                type="number"
                min={1}
                step={1}
                value={row.quantity}
                onChange={(quantity) => updateLine(index, { quantity })}
                aria-label={`Line ${index + 1} quantity`}
              />
              <Input
                label={index === 0 ? "Unit rate" : undefined}
                type="number"
                min={0}
                step="0.01"
                value={row.unitAmount}
                onChange={(unitAmount) => updateLine(index, { unitAmount })}
                aria-label={`Line ${index + 1} unit rate`}
              />
              <Input
                label={index === 0 ? "Tax %" : undefined}
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={row.taxRatePercent}
                onChange={(taxRatePercent) => updateLine(index, { taxRatePercent })}
                aria-label={`Line ${index + 1} tax rate`}
              />
              <div className={cx("flex items-end", index === 0 && "sm:pt-6")}>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="min-h-11"
                  onClick={() => {
                    if (lines.length > 1) {
                      setLines((current) => current.filter((_, i) => i !== index));
                    }
                  }}
                  disabled={lines.length <= 1}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="min-h-11 w-fit"
          onClick={() => setLines((current) => [...current, emptyLine()])}
        >
          Add line
        </Button>
      </div>

      <Input
        label="Discount"
        type="number"
        min={0}
        step="0.01"
        value={discountMajor}
        onChange={setDiscountMajor}
        className="sm:max-w-xs"
        hint="Invoice-level discount in the selected currency"
      />

      <div className="rounded-xl border border-secondary bg-secondary/20 p-4 text-sm">
        {previewTotals ? (
          <dl className="grid gap-2 sm:max-w-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-tertiary">Subtotal</dt>
              <dd className="tabular-nums text-primary">
                {formatMinorMoney(previewTotals.subtotalMinor, currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-tertiary">Tax</dt>
              <dd className="tabular-nums text-primary">
                {formatMinorMoney(previewTotals.taxMinor, currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-tertiary">Discount</dt>
              <dd className="tabular-nums text-primary">
                −{formatMinorMoney(previewTotals.discountMinor, currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-secondary pt-2 font-medium">
              <dt className="text-primary">Total</dt>
              <dd className="tabular-nums text-primary">
                {formatMinorMoney(previewTotals.totalMinor, currency)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="text-tertiary">Enter valid line items to preview totals.</p>
        )}
        <p className="mt-2 text-xs text-tertiary">Final totals are recalculated on the server.</p>
      </div>

      <Textarea
        label="Customer notes"
        value={notes}
        onChange={setNotes}
        placeholder="Shown on the invoice for the customer"
        textAreaClassName="min-h-20"
      />
      <Textarea
        label="Payment terms / conditions"
        value={terms}
        onChange={setTerms}
        placeholder="e.g. Payment due within 14 days of issue"
        textAreaClassName="min-h-20"
      />
      <Textarea
        label="Internal notes"
        value={internalNotes}
        onChange={setInternalNotes}
        placeholder="Private notes — not shown to the customer"
        textAreaClassName="min-h-20"
      />

      {actionError ? (
        <p
          role="alert"
          className="rounded-lg bg-error-primary px-3 py-2 text-sm text-error-primary ring-1 ring-error_subtle ring-inset"
        >
          {actionError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {status === "draft" || !invoiceId ? (
          <Button type="button" className="min-h-11" disabled={pending} onClick={handleFinalize}>
            {pending ? "Saving…" : "Save invoice"}
          </Button>
        ) : (
          <Button type="button" className="min-h-11" disabled={pending} onClick={handleUpdate}>
            {pending ? "Saving…" : "Update invoice"}
          </Button>
        )}
        {(status === "draft" || !invoiceId) && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={pending}
            onClick={handleDiscard}
          >
            Discard draft
          </Button>
        )}
      </div>
    </div>
  );
}

/** Create-flow entry used by /invoice/new */
export function InvoiceCreateFlow({
  clients,
  mockInvoiceAi = false,
  devDefaultsToSample = false,
  defaultPaymentTermsDays,
  defaultCurrency,
}: {
  clients: InvoiceClientOption[];
  mockInvoiceAi?: boolean;
  devDefaultsToSample?: boolean;
  defaultPaymentTermsDays?: number;
  defaultCurrency?: string;
}) {
  return (
    <InvoiceEditor
      mode="create"
      clients={clients}
      mockInvoiceAi={mockInvoiceAi}
      devDefaultsToSample={devDefaultsToSample}
      defaultPaymentTermsDays={defaultPaymentTermsDays}
      defaultCurrency={defaultCurrency}
    />
  );
}
