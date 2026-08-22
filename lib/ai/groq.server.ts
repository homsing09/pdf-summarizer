import "server-only";
import Groq from "groq-sdk";
export function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");
  return new Groq({ apiKey });
}
export const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
