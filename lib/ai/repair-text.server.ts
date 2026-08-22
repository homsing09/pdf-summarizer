import "server-only";
import { getGroqClient, GROQ_MODEL } from "./groq.server";
import { sanitizeModelOutput } from "./sanitize-output";
import type { RepairTextInput } from "@/lib/validation/repair-text.schema";

export async function repairTextWithCloudAi(input: RepairTextInput): Promise<string[]> {
  const client = getGroqClient();
  const repaired: string[] = [];
  for (const chunk of input.chunks) {
    const response = await client.chat.completions.create({
      model: GROQ_MODEL,
      temperature: 0.1,
      reasoning_effort: "none",
      reasoning_format: "hidden",
      messages: [{ role: "user", content: `แก้ข้อความ OCR ภาษาไทยให้ใกล้ต้นฉบับที่สุด ลบเฉพาะอักขระขยะและรวมช่องว่างที่แตกผิดตำแหน่ง ห้ามสรุป ห้ามอธิบาย และห้ามเพิ่มข้อเท็จจริง ตอบเฉพาะข้อความที่แก้แล้ว:\n\n${chunk}` }],
    });
    const content = sanitizeModelOutput(response.choices[0]?.message.content ?? "");
    if (!content) throw new Error("AI provider returned an empty repair");
    repaired.push(content);
  }
  return repaired;
}
