import "server-only";
import { sanitizeModelOutput } from "./sanitize-output";
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
export async function generateWithGemini(prompt: string, signal?: AbortSignal): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent`, { method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": apiKey }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 2048 } }), signal });
  if (!response.ok) throw Object.assign(new Error(`Gemini request failed (${response.status})`), { status: response.status });
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const result = sanitizeModelOutput(data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "");
  if (!result) throw new Error("Gemini returned an empty response");
  return result;
}
