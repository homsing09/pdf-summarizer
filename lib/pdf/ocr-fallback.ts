import { ensurePdfMobileCompatibility } from "./mobile-compat";

export async function runOcrFallbackPages(file: File, pageNumbers?: number[], options?: { signal?: AbortSignal; onProgress?: (completed: number, total: number) => void }): Promise<string[]> {
  ensurePdfMobileCompatibility();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/legacy/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const images: string[] = [];
  const selectedPages = pageNumbers ?? Array.from({ length: pdf.numPages }, (_, index) => index + 1);
  for (const pageNumber of selectedPages) {
    if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
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
    const abort = () => { worker.terminate(); reject(new DOMException("Aborted", "AbortError")); };
    options?.signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event: MessageEvent<{ texts?: string[]; error?: string; progress?: number; total?: number }>) => {
      if (event.data.progress !== undefined) { options?.onProgress?.(event.data.progress, event.data.total ?? selectedPages.length); return; }
      options?.signal?.removeEventListener("abort", abort);
      worker.terminate();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.texts ?? []);
    };
    worker.onerror = () => { options?.signal?.removeEventListener("abort", abort); worker.terminate(); reject(new Error("OCR worker failed")); };
    worker.postMessage({ images });
  });
}

export async function runOcrFallback(file: File, pageNumbers?: number[]): Promise<string> {
  return (await runOcrFallbackPages(file, pageNumbers)).join("\n\n");
}

export async function runOcrImage(file: File, options?: { signal?: AbortSignal; onProgress?: (completed: number, total: number) => void }): Promise<string> {
  const image = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("อ่านรูปภาพไม่สำเร็จ"));
    reader.onerror = () => reject(new Error("อ่านรูปภาพไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../../workers/ocr.worker.ts", import.meta.url));
    const abort = () => { worker.terminate(); reject(new DOMException("Aborted", "AbortError")); };
    options?.signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = (event: MessageEvent<{ texts?: string[]; error?: string; progress?: number; total?: number }>) => {
      if (event.data.progress !== undefined) { options?.onProgress?.(event.data.progress, event.data.total ?? 1); return; }
      options?.signal?.removeEventListener("abort", abort); worker.terminate();
      if (event.data.error) reject(new Error(event.data.error)); else resolve(event.data.texts?.[0]?.trim() ?? "");
    };
    worker.onerror = () => { options?.signal?.removeEventListener("abort", abort); worker.terminate(); reject(new Error("OCR worker failed")); };
    worker.postMessage({ images: [image] });
  });
}
