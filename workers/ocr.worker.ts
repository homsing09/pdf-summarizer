import { createWorker } from "tesseract.js";
self.onmessage = async (event: MessageEvent<{ images: string[] }>) => {
  const worker = await createWorker("eng+tha");
  try {
    const text: string[] = [];
    for (const image of event.data.images) text.push((await worker.recognize(image)).data.text);
    self.postMessage({ texts: text });
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : "OCR failed" }); }
  finally { await worker.terminate(); }
};
