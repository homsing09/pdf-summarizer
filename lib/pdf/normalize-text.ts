const THAI_MARKS = "\u0E31\u0E34-\u0E3A\u0E47-\u0E4E";
const THAI_TOKEN = /^[\u0E00-\u0E7F]+$/u;

function isFragmentedThaiLine(line: string): boolean {
  const thaiTokens = line.trim().split(/\s+/).filter((token) => THAI_TOKEN.test(token));
  if (thaiTokens.length < 4) return false;
  const shortTokens = thaiTokens.filter((token) => [...token].length <= 3).length;
  return shortTokens / thaiTokens.length >= 0.65;
}

function segmentThaiRun(run: string): string {
  const repairedRun = run.replace(/\u0E4D\u0E32/g, "\u0E33").normalize("NFC");
  if (typeof Intl.Segmenter !== "function") return repairedRun;
  const segmenter = new Intl.Segmenter("th", { granularity: "word" });
  return [...segmenter.segment(repairedRun)]
    .map(({ segment }) => segment)
    .filter(Boolean)
    .join(" ");
}

export function normalizeExtractedText(input: string): string {
  const normalized = input
    .normalize("NFC")
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(new RegExp(`\\s+(?=[${THAI_MARKS}])`, "gu"), "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return normalized
    .split("\n")
    .map((line) => {
      if (!isFragmentedThaiLine(line)) return line;
      return line.replace(/[\u0E00-\u0E7F]+(?:\s+[\u0E00-\u0E7F]+)+/gu, (run) =>
        segmentThaiRun(run.replace(/\s+/g, "")),
      );
    })
    .join("\n")
    .replace(/\s+([)\],.!?:;])/g, "$1");
}
