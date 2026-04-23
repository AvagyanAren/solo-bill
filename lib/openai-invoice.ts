import { loadEnvConfig } from "@next/env";
import OpenAI from "openai";
import { z } from "zod";

// In some dev/Turbopack paths, server actions see process.env before Next hydrates .env.
loadEnvConfig(process.cwd());

const PROMPT = `Convert the following freelancer work description into a structured invoice.

Return JSON with:
- title
- line_items (array of {name, price})
- total_amount

Description:
{{user_input}}`;

const draftSchema = z.object({
  title: z.string(),
  line_items: z.array(
    z.object({
      name: z.string(),
      price: z.coerce.number(),
    }),
  ),
  total_amount: z.coerce.number(),
});

export type GeneratedInvoiceDraft = z.infer<typeof draftSchema>;

const MOCK_INVOICE_AI_ENV = "SOLOBILL_MOCK_INVOICE_AI" as const;

/**
 * Set `SOLOBILL_MOCK_INVOICE_AI=1` in `.env` or `.env.local` to preview with sample data (no OpenAI, no API key).
 * Re-reads env here: server action bundles can miss top-level `loadEnvConfig` for custom variable names.
 */
export function isInvoiceAiMockMode(): boolean {
  loadEnvConfig(process.cwd());
  // Dynamic key so Next does not replace with `undefined` at bundle time in server actions.
  const v = process.env[MOCK_INVOICE_AI_ENV]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

/** Whether a client-requested “sample lines” draft is allowed (dev, or global mock env). */
export function isClientSampleDraftAllowed(): boolean {
  return process.env.NODE_ENV === "development" || isInvoiceAiMockMode();
}

function buildMockDraft(userInput: string): GeneratedInvoiceDraft {
  const t = userInput.trim() || "Sample project work";
  const short = t.length > 80 ? `${t.slice(0, 80)}…` : t;
  return {
    title: `Invoice — ${short}`,
    line_items: [
      { name: "Discovery & planning (sample line)", price: 400 },
      { name: "Design / implementation (sample line)", price: 850 },
      { name: "Revisions & handoff (sample line)", price: 250 },
    ],
    total_amount: 1500,
  };
}

/** Used when the user opts in to sample data (e.g. checkbox) or for tests. */
export function getMockInvoiceDraftForPreview(userInput: string): GeneratedInvoiceDraft {
  return buildMockDraft(userInput);
}

export async function generateInvoiceDraftFromText(
  userInput: string,
): Promise<{ ok: true; draft: GeneratedInvoiceDraft } | { ok: false; error: string }> {
  if (isInvoiceAiMockMode()) {
    return { ok: true, draft: buildMockDraft(userInput) };
  }

  loadEnvConfig(process.cwd());
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    return {
      ok: false,
      error:
        "Add OPENAI_API_KEY to your .env file (see .env.example), restart npm run dev, then try again. Create a key at https://platform.openai.com/api-keys",
    };
  }

  const client = new OpenAI({ apiKey: key });
  const userContent = PROMPT.replace("{{user_input}}", userInput.trim());

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
      messages: [{ role: "user", content: userContent }],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return { ok: false, error: "No response from the model." };
    }

    const json = JSON.parse(raw) as unknown;
    const parsed = draftSchema.safeParse(json);
    if (!parsed.success) {
      return { ok: false, error: "The model returned invalid data. Try again or shorten your description." };
    }

    return { ok: true, draft: parsed.data };
  } catch (e) {
    const message = e instanceof Error ? e.message : "OpenAI request failed.";
    return { ok: false, error: message };
  }
}
