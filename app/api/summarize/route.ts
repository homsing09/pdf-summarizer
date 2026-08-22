import { NextResponse } from "next/server";
import { summarizeDocument } from "@/lib/ai/summarize";
import { summarizeSchema } from "@/lib/validation/summarize.schema";
import { checkRateLimit, clientIdentifier, rateLimitHeaders } from "@/lib/api/rate-limit";
import { readBoundedJson, withTimeout } from "@/lib/api/request-guards";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const rateLimit = checkRateLimit(`summarize:${clientIdentifier(request)}`, 10, 60_000);
  const headers = rateLimitHeaders(rateLimit);
  if (!rateLimit.allowed) return NextResponse.json({ error: "Too many requests. Please wait and try again." }, { status: 429, headers });
  let body: unknown;
  try { body = await readBoundedJson(request); }
  catch (error) { return NextResponse.json({ error: error instanceof RangeError ? "Request body is too large" : "Invalid JSON body" }, { status: error instanceof RangeError ? 413 : 400, headers }); }
  const parsed = summarizeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400, headers });
  try { return NextResponse.json({ summary: await withTimeout((signal) => summarizeDocument(parsed.data, signal)) }, { headers }); }
  catch (error) {
    console.error("Summarization failed", error instanceof Error ? error.message : "Unknown error");
    const missingConfig = error instanceof Error && error.message.includes("GROQ_API_KEY");
    return NextResponse.json({ error: missingConfig ? "AI service is not configured" : "Unable to summarize document" }, { status: missingConfig ? 503 : 502, headers });
  }
}
