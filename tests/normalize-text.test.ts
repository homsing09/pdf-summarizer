import { describe, expect, it } from "vitest";
import { normalizeExtractedText } from "@/lib/pdf/normalize-text";

describe("normalizeExtractedText", () => {
  it("repairs fragmented Thai text while preserving numbers and punctuation", () => {
    const input = "เร ี ย น ผู ้ อ ํ า น ว ย ก า ร ก า ร ไฟ ฟ้า ส ่ ว น ภู ม ิ ภา ค เข ต 1 (ภา ค ต ะ ว ั น อ อ ก เฉ ี ย ง เห น ื อ ) จ ั ง ห ว ั ด อ ุ ด ร ธา น ี";
    const output = normalizeExtractedText(input);
    expect(output).toContain("เรียน");
    expect(output).toContain("ผู้ อำนวย การ");
    expect(output).toContain("การ ไฟฟ้า");
    expect(output).toContain("ส่วน ภูมิภาค");
    expect(output).toContain("เขต 1");
    expect(output).toContain("จังหวัด อุดรธานี");
  });

  it("keeps normal Thai spacing intact", () => {
    expect(normalizeExtractedText("เรียน ผู้อำนวยการ\nเลขที่ 123/2569")).toBe("เรียน ผู้อำนวยการ\nเลขที่ 123/2569");
  });

  it("removes zero-width characters and excess whitespace", () => {
    expect(normalizeExtractedText("เอก\u200Bสาร   ทดสอบ")).toBe("เอกสาร ทดสอบ");
  });
});
