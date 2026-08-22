import { replaceSelectedLines, selectTextForLocalRepair } from "@/lib/pdf/detect-noisy-text";

export async function repairTextInCloud(text: string, mode: "auto" | "all"): Promise<string> {
  const chunks = selectTextForLocalRepair(text, mode);
  if (!chunks.length) throw new Error("ไม่พบบรรทัดที่มีอักขระผิดปกติ");
  const repaired: string[] = [];
  for (let index = 0; index < chunks.length; index += 50) {
    const response = await fetch("/api/repair-text", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chunks: chunks.slice(index, index + 50) }),
    });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.chunks)) throw new Error(data.error ?? "Cloud AI ทำงานไม่สำเร็จ");
    repaired.push(...data.chunks);
  }
  return replaceSelectedLines(text, repaired, mode);
}
