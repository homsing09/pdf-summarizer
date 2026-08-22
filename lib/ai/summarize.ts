import "server-only";
import { chunkText } from "./chunk-text";
import { getGroqClient, GROQ_MODEL } from "./groq.server";
import { buildPrompt } from "./prompts";
import { sanitizeModelOutput } from "./sanitize-output";
import type { SummarizeInput } from "@/lib/validation/summarize.schema";
export async function summarizeDocument(input: SummarizeInput): Promise<string> {
  const chunks = chunkText(input.text);
  const client = getGroqClient();
  const partials: string[] = [];
  for (const chunk of chunks) {
    const response = await client.chat.completions.create({ model: GROQ_MODEL, temperature: 0.2, reasoning_effort: "none", reasoning_format: "hidden", messages: [
      { role: "system", content: "Summarize faithfully. Reply in the document's primary language." },
      { role: "user", content: buildPrompt(input.mode, chunk) },
    ]});
    const rawContent = response.choices[0]?.message.content;
    const content = rawContent ? sanitizeModelOutput(rawContent) : "";
    if (!content) throw new Error("AI provider returned an empty response");
    partials.push(content);
  }
  if (partials.length === 1) return partials[0];
  const merged = await client.chat.completions.create({ model: GROQ_MODEL, temperature: 0.1, reasoning_effort: "none", reasoning_format: "hidden", messages: [{ role: "user", content: buildPrompt(input.mode, partials.join("\n\n---\n\n")) }] });
  const rawContent = merged.choices[0]?.message.content;
  const content = rawContent ? sanitizeModelOutput(rawContent) : "";
  if (!content) throw new Error("AI provider returned an empty response");
  return content;
}
