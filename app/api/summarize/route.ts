import { NextResponse } from "next/server";
import { summarizeDocument } from "@/lib/ai/summarize";
import { summarizeSchema } from "@/lib/validation/summarize.schema";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const parsed = summarizeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.flatten() }, { status: 400 });
  try { return NextResponse.json({ summary: await summarizeDocument(parsed.data) }); }
  catch (error) {
    console.error("Summarization failed", error instanceof Error ? error.message : "Unknown error");
    const missingConfig = error instanceof Error && error.message.includes("GROQ_API_KEY");
    return NextResponse.json({ error: missingConfig ? "AI service is not configured" : "Unable to summarize document" }, { status: missingConfig ? 503 : 502 });
  }
}
