import { describe, expect, it } from "vitest";
import { chunkText } from "@/lib/ai/chunk-text";
describe("chunkText", () => {
  it("preserves bounded paragraphs", () => expect(chunkText(`${"a".repeat(70)}\n\n${"b".repeat(70)}`, 100)).toEqual(["a".repeat(70), "b".repeat(70)]));
  it("splits oversized paragraphs", () => expect(chunkText("x".repeat(250), 100).map((x) => x.length)).toEqual([100, 100, 50]));
  it("rejects unsafe sizes", () => expect(() => chunkText("text", 50)).toThrow());
});
