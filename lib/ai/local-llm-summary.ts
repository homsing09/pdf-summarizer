import { getLocalAiEngine } from "./local-engine";
export async function summarizeWithLocalAi(text: string, onProgress: (message: string) => void): Promise<string> {
  const engine = await getLocalAiEngine(onProgress);
  onProgress("Local AI ขั้นสูงกำลังอ่านและสรุปเอกสาร…");
  const response = await engine.chat.completions.create({ messages: [{ role: "user", content: `สรุปประเด็นสำคัญจากเอกสารต่อไปนี้เป็น bullet ภาษาเดียวกับเอกสาร
- ยึดตามข้อความเท่านั้น ห้ามแต่งชื่อ วันที่ ตัวเลข หรือข้อเท็จจริง
- เน้นวัตถุประสงค์ ผลลัพธ์ บุคคล/หน่วยงาน วันที่ และข้อสั่งการ
- ตอบเฉพาะผลสรุป

เอกสาร:
${text.slice(0, 24_000)}` }], temperature: 0.1, max_tokens: 1200 });
  const result = response.choices[0]?.message.content?.replace(/^```(?:text)?\s*/i, "").replace(/```$/i, "").trim();
  if (!result) throw new Error("Local AI ไม่ส่งผลสรุปกลับมา");
  return result;
}
