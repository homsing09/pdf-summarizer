import type { SummaryMode } from "@/lib/validation/summarize.schema";
const instructions: Record<SummaryMode, string> = {
  key_points: "สรุปประเด็นสำคัญเป็น bullet ที่กระชับและยึดตามเอกสารเท่านั้น",
  short_summary: "สรุปเอกสารแบบย่อ 2-4 ย่อหน้า โดยรักษาความหมายเดิม",
  action_items: "สกัดรายการสิ่งที่ต้องทำ ผู้รับผิดชอบ และกำหนดเวลา หากไม่มีข้อมูลให้ระบุว่าไม่พบ",
};
export function buildPrompt(mode: SummaryMode, text: string) {
  return `${instructions[mode]}\n\nห้ามแต่งข้อเท็จจริงที่ไม่มีในเอกสาร\n\nเอกสาร:\n${text}`;
}
