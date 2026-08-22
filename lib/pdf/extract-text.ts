import { normalizeExtractedText } from "./normalize-text";
import { reconstructLines, type PositionedText } from "./reconstruct-lines";
import { ensurePdfMobileCompatibility } from "./mobile-compat";

export type ExtractedPdfText = { rawText: string; cleanedText: string; rawPages: string[]; cleanedPages: string[] };

export function hasUsableText(text: string): boolean {
  return (text.match(/[\p{L}\p{N}]/gu) ?? []).length >= 10;
}

export async function getPdfPageCount(file: File): Promise<number> {
  ensurePdfMobileCompatibility();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  return pdf.numPages;
}

export async function extractPdfText(file: File, pageNumbers?: number[], options?: { signal?: AbortSignal; onProgress?: (completed: number, total: number) => void }): Promise<ExtractedPdfText> {
  ensurePdfMobileCompatibility();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages: string[] = [];
  const selectedPages = pageNumbers ?? Array.from({ length: pdf.numPages }, (_, index) => index + 1);
  for (const [index, pageNumber] of selectedPages.entries()) {
    if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
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
    options?.onProgress?.(index + 1, selectedPages.length);
  }
  const rawText = pages.join("\n\n").trim();
  const cleanedPages = pages.map(normalizeExtractedText);
  return { rawText, cleanedText: cleanedPages.join("\n\n").trim(), rawPages: pages, cleanedPages };
}
