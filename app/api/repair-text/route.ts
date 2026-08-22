import { NextResponse } from "next/server";
import { repairTextWithCloudAi } from "@/lib/ai/repair-text.server";
import { repairTextSchema } from "@/lib/validation/repair-text.schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }
  const parsed = repairTextSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try { return NextResponse.json({ chunks: await repairTextWithCloudAi(parsed.data) }); }
  catch (error) {
    console.error("Text repair failed", error instanceof Error ? error.message : "Unknown error");
    const missingConfig = error instanceof Error && error.message.includes("GROQ_API_KEY");
    return NextResponse.json({ error: missingConfig ? "AI service is not configured" : "Unable to repair text" }, { status: missingConfig ? 503 : 502 });
  }
}
