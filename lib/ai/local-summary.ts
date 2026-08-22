const SIGNAL_WORDS = /สำคัญ|สรุป|ผล|เป้าหมาย|ปัญหา|กำหนด|ต้อง|ควร|ดำเนิน|อนุมัติ|ประชุม|important|result|target|action|must/iu;

export function summarizeKeyPointsLocally(text: string, limit = 5): string {
  const candidates = text
    .split(/\n+|(?<=[.!?])\s+/u)
    .map((value, index) => ({ value: value.replace(/\s+/g, " ").trim(), index }))
    .filter(({ value }) => (value.match(/[\p{L}\p{N}]/gu) ?? []).length >= 15);

  const unique = candidates.filter(({ value }, index, values) => values.findIndex((item) => item.value === value) === index);
  const selected = unique
    .map((item) => ({ ...item, score: (SIGNAL_WORDS.test(item.value) ? 3 : 0) + (/\d/u.test(item.value) ? 2 : 0) + Math.min(item.value.length / 120, 1) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index);

  return selected.length ? selected.map(({ value }) => `• ${value}`).join("\n") : "• ไม่พบข้อความที่เพียงพอสำหรับสรุปภายในเครื่อง";
}
