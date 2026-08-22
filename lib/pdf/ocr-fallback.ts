import { ensurePdfMobileCompatibility } from "./mobile-compat";

type OcrOptions = {
  signal?: AbortSignal;
  onProgress?: (completed: number, total: number) => void;
};

type PdfObjectStore = {
  get: (id: string, callback: (value: unknown) => void) => unknown;
};

async function waitForPageImages(
  page: unknown,
  operatorList: { fnArray: number[]; argsArray: unknown[][] },
  imageOperationIds: ReadonlySet<number>,
): Promise<void> {
  const stores = page as { objs: PdfObjectStore; commonObjs: PdfObjectStore };
  const imageIds = operatorList.fnArray.flatMap((operation, index) => {
    if (!imageOperationIds.has(operation)) return [];
    const id = operatorList.argsArray[index]?.[0];
    return typeof id === "string" ? [id] : [];
  });
  await Promise.all([...new Set(imageIds)].map((id) => new Promise<void>((resolve) => {
    const store = id.startsWith("g_") ? stores.commonObjs : stores.objs;
    store.get(id, () => resolve());
  })));
}

async function createOcrWorker(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["eng", "tha"], 1, { langPath: "/tessdata" });
  if (signal?.aborted) {
    await worker.terminate();
    throw new DOMException("Aborted", "AbortError");
  }
  return worker;
}

export async function runOcrFallbackPages(
  file: File,
  pageNumbers?: number[],
  options?: OcrOptions,
): Promise<string[]> {
  ensurePdfMobileCompatibility();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const pdf = await pdfjs.getDocument({
    data: await file.arrayBuffer(),
    // Avoid asynchronous decoder paths that can leave scanned page images
    // unresolved when the OCR canvas is rendered in some browsers.
    isImageDecoderSupported: false,
    isOffscreenCanvasSupported: false,
  }).promise;
  const selectedPages = pageNumbers ?? Array.from(
    { length: pdf.numPages },
    (_, index) => index + 1,
  );
  const worker = await createOcrWorker(options?.signal);
  const abort = () => { void worker.terminate(); };
  options?.signal?.addEventListener("abort", abort, { once: true });

  try {
    const texts: string[] = [];
    for (const [index, pageNumber] of selectedPages.entries()) {
      if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      if (pageNumber < 1 || pageNumber > pdf.numPages) {
        throw new Error("Selected PDF page is out of range");
      }
      const page = await pdf.getPage(pageNumber);
      const operatorList = await page.getOperatorList();
      await waitForPageImages(page, operatorList, new Set([
        pdfjs.OPS.paintImageXObject,
        pdfjs.OPS.paintImageXObjectRepeat,
      ]));
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const canvasContext = canvas.getContext("2d", { alpha: false });
      if (!canvasContext) throw new Error("Canvas is unavailable");
      await page.render({ canvas, canvasContext, viewport, background: "#ffffff" }).promise;
      texts.push((await worker.recognize(canvas)).data.text);
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
      options?.onProgress?.(index + 1, selectedPages.length);
    }
    return texts;
  } catch (error) {
    if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    throw error;
  } finally {
    options?.signal?.removeEventListener("abort", abort);
    await worker.terminate();
    await pdf.loadingTask.destroy();
  }
}

export async function runOcrFallback(file: File, pageNumbers?: number[]): Promise<string> {
  return (await runOcrFallbackPages(file, pageNumbers)).join("\n\n");
}

export async function runOcrImage(file: File, options?: OcrOptions): Promise<string> {
  const image = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === "string"
      ? resolve(reader.result)
      : reject(new Error("อ่านรูปภาพไม่สำเร็จ"));
    reader.onerror = () => reject(new Error("อ่านรูปภาพไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
  const worker = await createOcrWorker(options?.signal);
  const abort = () => { void worker.terminate(); };
  options?.signal?.addEventListener("abort", abort, { once: true });
  try {
    const result = await worker.recognize(image);
    options?.onProgress?.(1, 1);
    return result.data.text.trim();
  } catch (error) {
    if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    throw error;
  } finally {
    options?.signal?.removeEventListener("abort", abort);
    await worker.terminate();
  }
}
