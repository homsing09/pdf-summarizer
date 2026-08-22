import { describe, expect, it } from "vitest";
import { summarizeSchema } from "@/lib/validation/summarize.schema";
describe("summarizeSchema", () => {
  it("accepts valid input", () => expect(summarizeSchema.safeParse({ text: "a".repeat(50), mode: "key_points" }).success).toBe(true));
  it("accepts cloud analysis mode", () => expect(summarizeSchema.safeParse({ text: "a".repeat(50), mode: "analysis" }).success).toBe(true));
  it("rejects unknown fields", () => expect(summarizeSchema.safeParse({ text: "a".repeat(50), mode: "key_points", model: "override" }).success).toBe(false));
  it("rejects invalid input", () => expect(summarizeSchema.safeParse({ text: "short", mode: "anything" }).success).toBe(false));
  it("rejects text above the cloud cost boundary", () => expect(summarizeSchema.safeParse({ text: "a".repeat(120_001), mode: "key_points" }).success).toBe(false));
});
