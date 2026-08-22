import { describe, expect, it } from "vitest";
import { createPageRange } from "../lib/pdf/page-selection";

describe("createPageRange", () => {
  it("creates an inclusive page range", () => expect(createPageRange(2, 4, 7)).toEqual([2, 3, 4]));
  it("supports selecting every page", () => expect(createPageRange(1, 3, 3)).toEqual([1, 2, 3]));
  it.each([[0, 2, 3], [2, 4, 3], [3, 2, 3], [1.5, 2, 3]])("rejects invalid ranges", (from, to, total) => {
    expect(() => createPageRange(from, to, total)).toThrow();
  });
});
