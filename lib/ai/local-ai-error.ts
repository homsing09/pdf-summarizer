export function localAiErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/WebGPU|GPU adapter/i.test(message)) return message;
  if (/network|fetch|download/i.test(message)) return "ดาวน์โหลดโมเดล Local AI ไม่สำเร็จ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่";
  if (/memory|allocation|device lost|out of/i.test(message)) return "หน่วยความจำ GPU ไม่เพียงพอสำหรับ Local AI กรุณาใช้โหมดมาตรฐาน";
  return "Local AI เริ่มทำงานไม่สำเร็จ กรุณาใช้ Chrome/Edge รุ่นล่าสุด หรือลองโหมดมาตรฐาน";
}
