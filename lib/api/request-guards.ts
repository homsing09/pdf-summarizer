export const MAX_JSON_BYTES = 160_000;

export function isBodyTooLarge(request: Request, maxBytes = MAX_JSON_BYTES): boolean {
  const length = Number(request.headers.get("content-length"));
  return Number.isFinite(length) && length > maxBytes;
}

export async function readBoundedJson(request: Request, maxBytes = MAX_JSON_BYTES): Promise<unknown> {
  if (isBodyTooLarge(request, maxBytes)) throw new RangeError("Request body is too large");
  if (!request.body) throw new SyntaxError("Missing JSON body");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new RangeError("Request body is too large"); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export async function withTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs = 45_000): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new Error("Operation timed out")); }, timeoutMs);
  });
  try { return await Promise.race([operation(controller.signal), timeout]); }
  finally { if (timer) clearTimeout(timer); }
}
