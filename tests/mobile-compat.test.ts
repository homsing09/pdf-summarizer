import { describe, expect, it } from "vitest";
import { installReadableStreamAsyncIterator } from "../lib/pdf/mobile-compat";

describe("PDF mobile compatibility", () => {
  it("adds an async iterator to Safari-like ReadableStream prototypes", async () => {
    const prototype: Record<PropertyKey, unknown> = {};
    expect(installReadableStreamAsyncIterator(prototype)).toBe(true);
    const iterator = prototype[Symbol.asyncIterator] as (this: { getReader: () => object }) => AsyncGenerator<string>;
    let reads = 0;
    let released = false;
    const values: string[] = [];
    for await (const value of iterator.call({ getReader: () => ({
      read: async () => ++reads === 1 ? { done: false, value: "ข้อความ" } : { done: true },
      cancel: async () => undefined,
      releaseLock: () => { released = true; },
    }) })) values.push(value);
    expect(values).toEqual(["ข้อความ"]);
    expect(released).toBe(true);
  });

  it("does not replace a native implementation", () => {
    const existing = async function* () { yield "native"; };
    const prototype = { [Symbol.asyncIterator]: existing };
    expect(installReadableStreamAsyncIterator(prototype)).toBe(false);
    expect(prototype[Symbol.asyncIterator]).toBe(existing);
  });
});
