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
      messages: [{ role: "user", content: `คุณเป็นตัวแก้ข้อความ OCR เอกสารราชการภาษาไทย ตรวจคำจากบริบททั้งประโยค\n- แทน glyph ภาษาต่างประเทศที่ปนกลางคำไทยด้วยอักษรไทยที่ทำให้คำนั้นถูกต้อง\n- รวมพยัญชนะกับสระ/วรรณยุกต์ที่ถูกแยกด้วยช่องว่าง\n- ตัวอย่าง: ผู้บริĀาร -> ผู้บริหาร\n- ตัวอย่าง: ประจ าเดือน -> ประจำเดือน\n- ห้ามสรุป ห้ามอธิบาย ห้ามเพิ่มชื่อ วันที่ ตัวเลข หรือข้อเท็จจริง\n- ตอบเฉพาะข้อความที่แก้แล้วหนึ่งบรรทัด\n\nข้อความ:\n${chunk}` }],
    });
    const content = sanitizeModelOutput(response.choices[0]?.message.content ?? "");
    if (!content) throw new Error("AI provider returned an empty repair");
    repaired.push(content);
  }
  return repaired;
}
