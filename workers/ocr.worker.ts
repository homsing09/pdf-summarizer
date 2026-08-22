import { createWorker } from "tesseract.js";
self.onmessage = async (event: MessageEvent<{ images: string[] }>) => {
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  try {
    // Keep OCR independent from third-party CDNs. Mobile networks, privacy
    // filters, and corporate firewalls commonly block the default model host.
    worker = await createWorker(["eng", "tha"], 1, {
      langPath: "/tessdata",
    });
    const text: string[] = [];
    for (const [index, image] of event.data.images.entries()) {
      text.push((await worker.recognize(image)).data.text);
      self.postMessage({ progress: index + 1, total: event.data.images.length });
    }
    self.postMessage({ texts: text });
  } catch (error) { self.postMessage({ error: error instanceof Error ? error.message : "OCR failed" }); }
  finally { await worker?.terminate(); }
};
