import { ensurePdfMobileCompatibility } from "./mobile-compat";

export async function runOcrFallback(file: File, pageNumbers?: number[]): Promise<string> {
  ensurePdfMobileCompatibility();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const images: string[] = [];
  const selectedPages = pageNumbers ?? Array.from({ length: pdf.numPages }, (_, index) => index + 1);
  for (const pageNumber of selectedPages) {
    if (pageNumber < 1 || pageNumber > pdf.numPages) throw new Error("Selected PDF page is out of range");
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) throw new Error("Canvas is unavailable");
    await page.render({ canvas, canvasContext, viewport }).promise;
    images.push(canvas.toDataURL("image/jpeg", 0.9));
  }
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../../workers/ocr.worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent<{ text?: string; error?: string }>) => {
      worker.terminate();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.text ?? "");
    };
    worker.onerror = () => { worker.terminate(); reject(new Error("OCR worker failed")); };
    worker.postMessage({ images });
  });
}
