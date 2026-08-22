const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const REPLACEMENT_CHARACTER = /\uFFFD/;
const REPEATED_SYMBOLS = /([^\p{L}\p{N}\s])\1{3,}/u;
const ISOLATED_THAI = /(?:^|\s)[\u0E01-\u0E2E](?:\s[\u0E01-\u0E4E]){3,}(?:\s|$)/u;
const THAI_WITH_FOREIGN_GLYPH = /(?=.*[\u0E00-\u0E7F])(?=.*[\u00C0-\u024F])/u;
const SEPARATED_THAI_VOWEL = /[\u0E01-\u0E2E]\s+[\u0E30-\u0E3A]/u;

export function isNoisyLine(line: string): boolean {
  if (!line.trim()) return false;
  return CONTROL_CHARACTERS.test(line) || REPLACEMENT_CHARACTER.test(line) || REPEATED_SYMBOLS.test(line) || ISOLATED_THAI.test(line) || THAI_WITH_FOREIGN_GLYPH.test(line) || SEPARATED_THAI_VOWEL.test(line);
}

export function selectTextForLocalRepair(text: string, mode: "auto" | "all"): string[] {
  const lines = text.split("\n");
  if (mode === "auto") return lines.filter(isNoisyLine);
  const selected = lines;
  const chunks: string[] = [];
  let current = "";
  for (const line of selected) {
    if (current && current.length + line.length + 1 > 1800) {
      chunks.push(current);
      current = "";
    }
    current += `${current ? "\n" : ""}${line}`;
  }
  if (current.trim()) chunks.push(current);
  return chunks;
}

export function replaceSelectedLines(original: string, repairedChunks: string[], mode: "auto" | "all"): string {
  if (mode === "all") return repairedChunks.join("\n").trim();
  let index = 0;
  return original.split("\n").map((line) => isNoisyLine(line) ? (repairedChunks[index++]?.replace(/\s*\n\s*/g, " ") || line) : line).join("\n");
}
