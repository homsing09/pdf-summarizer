export async function runOcrFallback(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const images: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
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
