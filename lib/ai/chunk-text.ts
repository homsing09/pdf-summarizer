export function chunkText(text: string, maxChars = 12_000): string[] {
  if (maxChars < 100) throw new Error("maxChars must be at least 100");
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of normalized.split(/\n{2,}/)) {
    if (paragraph.length > maxChars) {
      if (current) chunks.push(current);
      for (let start = 0; start < paragraph.length; start += maxChars) chunks.push(paragraph.slice(start, start + maxChars));
      current = "";
      continue;
    }
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length > maxChars) { chunks.push(current); current = paragraph; } else current = candidate;
  }
  if (current) chunks.push(current);
  return chunks;
}
