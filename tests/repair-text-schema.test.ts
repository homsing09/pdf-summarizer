import { describe, expect, it } from "vitest";
import { repairTextSchema } from "../lib/validation/repair-text.schema";

describe("repairTextSchema", () => {
  it("accepts bounded chunks", () => expect(repairTextSchema.safeParse({ chunks: ["ข้อความทดสอบ"] }).success).toBe(true));
  it("rejects infrastructure controls", () => expect(repairTextSchema.safeParse({ chunks: ["ข้อความ"], model: "other" }).success).toBe(false));
  it("rejects oversized chunks", () => expect(repairTextSchema.safeParse({ chunks: ["ก".repeat(2_001)] }).success).toBe(false));
});
