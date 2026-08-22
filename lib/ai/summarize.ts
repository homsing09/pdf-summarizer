import "server-only";
import { chunkText } from "./chunk-text";
import { getGroqClient, GROQ_MODEL } from "./groq.server";
import { generateWithGemini } from "./gemini.server";
import { buildPrompt } from "./prompts";
import { sanitizeModelOutput } from "./sanitize-output";
import type { SummarizeInput } from "@/lib/validation/summarize.schema";
export type CloudSummary = { summary: string; provider: "Groq" | "Gemini" };
function canFailOver(error: unknown): boolean {
  if (error instanceof Error && /API_KEY is not configured|timed out|fetch failed/i.test(error.message)) return true;
  const status = (error as { status?: number } | null)?.status;
  return status === 401 || status === 403 || status === 408 || status === 429 || status === 498 || (typeof status === "number" && status >= 500);
}
async function summarizeWithGroq(input: SummarizeInput, signal?: AbortSignal): Promise<string> {
  const client = getGroqClient();
  const partials: string[] = [];
  for (const chunk of chunkText(input.text)) {
    const response = await client.chat.completions.create({ model: GROQ_MODEL, temperature: 0.2, reasoning_effort: "none", reasoning_format: "hidden", messages: [{ role: "system", content: "Summarize faithfully. Reply in the document's primary language." }, { role: "user", content: buildPrompt(input.mode, chunk) }] }, { signal });
    const content = sanitizeModelOutput(response.choices[0]?.message.content ?? "");
    if (!content) throw new Error("Groq returned an empty response");
    partials.push(content);
  }
  if (partials.length === 1) return partials[0];
  const merged = await client.chat.completions.create({ model: GROQ_MODEL, temperature: 0.1, reasoning_effort: "none", reasoning_format: "hidden", messages: [{ role: "user", content: buildPrompt(input.mode, partials.join("\n\n---\n\n")) }] }, { signal });
  const result = sanitizeModelOutput(merged.choices[0]?.message.content ?? "");
  if (!result) throw new Error("Groq returned an empty response");
  return result;
}
export async function summarizeDocument(input: SummarizeInput, signal?: AbortSignal): Promise<CloudSummary> {
  try { return { summary: await summarizeWithGroq(input, signal), provider: "Groq" }; }
  catch (error) {
    if (!canFailOver(error)) throw error;
    return { summary: await generateWithGemini(buildPrompt(input.mode, input.text), signal), provider: "Gemini" };
  }
}
