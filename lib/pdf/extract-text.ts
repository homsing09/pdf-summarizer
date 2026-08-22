import { normalizeExtractedText } from "./normalize-text";
import { reconstructLines, type PositionedText } from "./reconstruct-lines";

export type ExtractedPdfText = { rawText: string; cleanedText: string };

export async function getPdfPageCount(file: File): Promise<number> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  return pdf.numPages;
}

export async function extractPdfText(file: File, pageNumbers?: number[]): Promise<ExtractedPdfText> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  const selectedPages = pageNumbers ?? Array.from({ length: pdf.numPages }, (_, index) => index + 1);
  for (const pageNumber of selectedPages) {
    if (pageNumber < 1 || pageNumber > pdf.numPages) throw new Error("Selected PDF page is out of range");
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
