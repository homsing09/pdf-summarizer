import { createWorker } from "tesseract.js";
self.onmessage = async (event: MessageEvent<{ images: string[] }>) => {
  const worker = await createWorker("eng+tha");
  try {
    const text: string[] = [];
    for (const [index, image] of event.data.images.entries()) {
      text.push((await worker.recognize(image)).data.text);
      self.postMessage({ progress: index + 1, total: event.data.images.length });
    }
    self.postMessage({ texts: text });
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : "OCR failed" }); }
  finally { await worker.terminate(); }
};
