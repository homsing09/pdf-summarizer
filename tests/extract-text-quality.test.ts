import { describe, expect, it } from "vitest";
import { hasUsableText } from "../lib/pdf/extract-text";

describe("hasUsableText", () => {
  it("accepts a page with meaningful text", () => expect(hasUsableText("หนังสือแจ้งประชุมประจำเดือน")).toBe(true));
  it("rejects empty and symbol-only text layers", () => expect(hasUsableText("  -- □□□ --  ")).toBe(false));
});
