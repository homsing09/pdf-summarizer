import { CreateMLCEngine, type MLCEngineInterface } from "@mlc-ai/web-llm";
const LOCAL_MODEL = "Qwen2.5-0.5B-Instruct-q4f16_1-MLC";
let enginePromise: Promise<MLCEngineInterface> | null = null;
export async function getLocalAiEngine(onProgress: (message: string) => void) {
  const gpu = (navigator as Navigator & { gpu?: { requestAdapter?: () => Promise<unknown> } }).gpu;
  if (!gpu || typeof gpu.requestAdapter !== "function") throw new Error("Browser หรืออุปกรณ์นี้ไม่รองรับ WebGPU");
  if (!await gpu.requestAdapter()) throw new Error("ไม่พบ GPU adapter ที่รองรับ Local AI");
  if (!enginePromise) enginePromise = CreateMLCEngine(LOCAL_MODEL, { initProgressCallback: (report) => onProgress(`กำลังเตรียม Local AI ${Math.round(report.progress * 100)}%`) }).catch((error) => { enginePromise = null; throw error; });
  return enginePromise;
}
