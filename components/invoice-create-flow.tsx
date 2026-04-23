"use client";

import { useActionState, useMemo, useState } from "react";

import {
  createInvoiceAction,
  draftInvoiceFromDescription,
  type CreateInvoiceState,
} from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ClientOption = {
  id: string;
  name: string;
  email: string;
};

function defaultDueDateString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

type LineRow = { name: string; price: string };

function serializeLines(rows: LineRow[]): string {
  const items = rows
    .map((row) => ({
      name: row.name.trim(),
      price: Number(row.price),
    }))
    .filter((row) => row.name.length > 0 && Number.isFinite(row.price));
  return JSON.stringify(items);
}

export function InvoiceCreateFlow({
  clients,
  mockInvoiceAi = false,
  devDefaultsToSample = false,
}: {
  clients: ClientOption[];
  /** Server passes true when SOLOBILL_MOCK_INVOICE_AI is set */
  mockInvoiceAi?: boolean;
  /** In `next dev`, default sample-lines on so the flow works without OpenAI */
  devDefaultsToSample?: boolean;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [dueDate, setDueDate] = useState(defaultDueDateString());
  const [workDescription, setWorkDescription] = useState("");
  /** Opt out of OpenAI: sample lines. Defaults on when `SOLOBILL_MOCK_INVOICE_AI` is set (server). */
  const [useSampleLines, setUseSampleLines] = useState(() => mockInvoiceAi || devDefaultsToSample);
  const [genError, setGenError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("0");
  const [lines, setLines] = useState<LineRow[]>([{ name: "", price: "" }]);

  const initialCreate: CreateInvoiceState = {};
  const [createState, createAction, saving] = useActionState(
    createInvoiceAction,
    initialCreate,
  );

  const lineItemsJson = useMemo(() => serializeLines(lines), [lines]);

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
      setAmount(String(result.draft.total_amount));
      setLines(
        result.draft.line_items.length > 0
          ? result.draft.line_items.map((row) => ({
              name: row.name,
              price: String(row.price),
            }))
          : [{ name: "", price: "" }],
      );
      setStep(2);
    } finally {
      setGenerating(false);
    }
  }

  function updateLine(index: number, patch: Partial<LineRow>) {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function addLine() {
    setLines((prev) => [...prev, { name: "", price: "" }]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  if (step === 1) {
    return (
      <div className="mx-auto grid max-w-xl gap-6">
        {mockInvoiceAi ? (
          <p className="text-xs text-muted-foreground">
            You are in <span className="font-medium">mock / preview</span> mode: <span className="font-medium">Use sample
            line items</span> is on — Generate uses fixed sample amounts, not OpenAI.
          </p>
        ) : null}
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <input
            id="useSampleLines"
            type="checkbox"
            checked={useSampleLines}
            onChange={(e) => setUseSampleLines(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 rounded border-input"
          />
          <label htmlFor="useSampleLines" className="text-sm leading-snug text-foreground">
            <span className="font-medium">Use sample line items</span>{" "}
            <span className="text-muted-foreground">
              (skip OpenAI — use this to preview the flow with a valid-looking draft; no API key needed in development.)
            </span>
          </label>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="clientId">Client</Label>
          <select
            id="clientId"
            name="clientId"
            className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            required
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.email})
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="description">What did you do?</Label>
          <Textarea
            id="description"
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
            placeholder="Example: Landing page design, 3 screens, two revision rounds."
            className="min-h-32"
            required
          />
        </div>
        {genError ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {genError}
          </p>
        ) : null}
        <Button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={generating || !workDescription.trim() || !clientId}
        >
          {generating ? "Generating…" : "Generate invoice"}
        </Button>
      </div>
    );
  }

  return (
    <form action={createAction} className="mx-auto grid max-w-xl gap-6">
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="dueDate" value={dueDate} />
      <input type="hidden" name="description" value={workDescription} />
      <input type="hidden" name="lineItemsJson" value={lineItemsJson} />

      <div className="flex justify-start">
        <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)}>
          ← Edit description
        </Button>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="title">Invoice title</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>

      <div className="grid gap-3">
        <Label>Line items</Label>
        <div className="grid gap-3">
          {lines.map((row, index) => (
            <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="grid flex-1 gap-1">
                <span className="sr-only">Description {index + 1}</span>
                <Input
                  placeholder="Service or item"
                  value={row.name}
                  onChange={(e) => updateLine(index, { name: e.target.value })}
                  aria-label={`Line ${index + 1} description`}
                />
              </div>
              <div className="grid w-full gap-1 sm:w-32">
                <span className="sr-only">Price {index + 1}</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={row.price}
                  onChange={(e) => updateLine(index, { price: e.target.value })}
                  aria-label={`Line ${index + 1} amount`}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="sm:mb-0.5"
                onClick={() => removeLine(index)}
                disabled={lines.length <= 1}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button type="button" variant="secondary" size="sm" className="w-fit" onClick={addLine}>
          Add line
        </Button>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="amount">Total amount</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      {createState?.error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {createState.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full sm:w-auto" disabled={saving}>
        {saving ? "Saving…" : "Save invoice"}
      </Button>
    </form>
  );
}
