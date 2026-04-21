import OpenAI from "openai";
import { z } from "zod";

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

export async function generateInvoiceDraftFromText(
  userInput: string,
): Promise<{ ok: true; draft: GeneratedInvoiceDraft } | { ok: false; error: string }> {
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
