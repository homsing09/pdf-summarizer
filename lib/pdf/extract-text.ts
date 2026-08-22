import { normalizeExtractedText } from "./normalize-text";
import { reconstructLines, type PositionedText } from "./reconstruct-lines";

export type ExtractedPdfText = { rawText: string; cleanedText: string };

export async function extractPdfText(file: File): Promise<ExtractedPdfText> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const content = await (await pdf.getPage(pageNumber)).getTextContent();
    const items: PositionedText[] = content.items.flatMap((item) => {
      if (!("str" in item)) return [];
      return [{
        text: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width,
        height: item.height,
      }];
    });
    pages.push(reconstructLines(items));
  }
  const rawText = pages.join("\n\n").trim();
  return { rawText, cleanedText: normalizeExtractedText(rawText) };
}
