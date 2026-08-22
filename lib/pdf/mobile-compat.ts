type StreamReader<T> = {
  read: () => Promise<{ done: boolean; value?: T }>;
  cancel: (reason?: unknown) => Promise<void>;
  releaseLock: () => void;
};

type StreamLike<T> = { getReader: () => StreamReader<T> };

export function installReadableStreamAsyncIterator(prototype: Record<PropertyKey, unknown>): boolean {
  if (typeof Symbol.asyncIterator !== "symbol" || typeof prototype[Symbol.asyncIterator] === "function") return false;
  Object.defineProperty(prototype, Symbol.asyncIterator, {
    configurable: true,
    writable: true,
    value: async function* <T>(this: StreamLike<T>) {
      const reader = this.getReader();
      try {
        while (true) {
          const result = await reader.read();
          if (result.done) return;
          yield result.value as T;
        }
      } finally { reader.releaseLock(); }
    },
  });
  return true;
}

export function ensurePdfMobileCompatibility() {
  if (typeof ReadableStream !== "undefined") {
    installReadableStreamAsyncIterator(ReadableStream.prototype as unknown as Record<PropertyKey, unknown>);
  }
}
