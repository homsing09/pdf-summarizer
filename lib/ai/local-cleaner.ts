import { CreateMLCEngine, type MLCEngineInterface } from "@mlc-ai/web-llm";
import { replaceSelectedLines, selectTextForLocalRepair } from "@/lib/pdf/detect-noisy-text";

const LOCAL_MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
let enginePromise: Promise<MLCEngineInterface> | null = null;

async function getEngine(onProgress: (message: string) => void) {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter?: () => Promise<unknown> } }).gpu;
  if (!gpu || typeof gpu.requestAdapter !== "function") throw new Error("Browser หรืออุปกรณ์นี้ไม่รองรับ WebGPU");
  if (!await gpu.requestAdapter()) throw new Error("ไม่พบ GPU adapter ที่รองรับ Local AI");
  if (!enginePromise) {
    enginePromise = CreateMLCEngine(
      LOCAL_MODEL,
      { initProgressCallback: (report) => onProgress(`กำลังเตรียม Local AI ${Math.round(report.progress * 100)}%`) },
    ).catch((error) => { enginePromise = null; throw error; });
  }
  return enginePromise;
}

function cleanAnswer(answer: string): string {
  return answer.replace(/^```(?:text)?\s*/i, "").replace(/```$/i, "").trim();
}

export function localAiErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/WebGPU|GPU adapter/i.test(message)) return message;
  if (/network|fetch|download/i.test(message)) return "ดาวน์โหลดโมเดล Local AI ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่";
  if (/memory|allocation|device lost|out of/i.test(message)) return "หน่วยความจำ GPU ไม่เพียงพอสำหรับ Local AI กรุณาใช้โหมดมาตรฐาน";
  return "Local AI เริ่มทำงานไม่สำเร็จ กรุณาใช้ Chrome/Edge รุ่นล่าสุด หรือลองโหมดมาตรฐาน";
}

export async function repairTextLocally(text: string, mode: "auto" | "all", onProgress: (message: string) => void): Promise<string> {
  const chunks = selectTextForLocalRepair(text, mode);
  if (!chunks.length) throw new Error("ไม่พบบรรทัดที่มีอักขระผิดปกติ");
  const engine = await getEngine(onProgress);
  const repaired: string[] = [];
  for (let index = 0; index < chunks.length; index += 1) {
    onProgress(`Local AI กำลังแก้ข้อความส่วนที่ ${index + 1}/${chunks.length}`);
    const response = await engine.chat.completions.create({
      messages: [{ role: "user", content: `แก้ข้อความ OCR ภาษาไทยด้านล่างให้ใกล้ต้นฉบับที่สุด\n- ลบเฉพาะอักขระขยะและรวมตัวอักษร/ช่องว่างที่แตกผิดตำแหน่ง\n- ห้ามสรุป ห้ามอธิบาย ห้ามเพิ่มชื่อ วันที่ ตัวเลข หรือข้อเท็จจริง\n- รักษาลำดับบรรทัดเดิม และตอบเฉพาะข้อความที่แก้แล้ว\n\nข้อความ:\n${chunks[index]}` }],
      temperature: 0.1,
      max_tokens: 1200,
    });
    const answer = cleanAnswer(response.choices[0]?.message.content ?? "");
    if (!answer) throw new Error("Local AI ไม่ส่งข้อความกลับมา");
    repaired.push(answer);
  }
  return replaceSelectedLines(text, repaired, mode);
}
