import { describe, expect, it } from "vitest";
import { isNoisyLine, replaceSelectedLines, selectTextForLocalRepair } from "../lib/pdf/detect-noisy-text";

describe("noisy text detection", () => {
  it("detects isolated Thai characters caused by broken spacing", () => expect(isNoisyLine("เร ี ย น ผู ้ อ ํ า น ว ย ก า ร")).toBe(true));
  it("keeps normal Thai text", () => expect(isNoisyLine("เรียน ผู้อำนวยการ การไฟฟ้าส่วนภูมิภาค")).toBe(false));
  it("detects a foreign glyph embedded in Thai text", () => expect(isNoisyLine("ขอเชิญประชุมผู้บริĀารประจำเดือน")).toBe(true));
  it("detects a Thai vowel separated from its consonant", () => expect(isNoisyLine("ขอเชิญประชุมประจ าเดือน")).toBe(true));
  it("selects only suspicious lines in auto mode", () => {
    expect(selectTextForLocalRepair("ข้อความปกติ\nเร ี ย น ผู ้ อ ํ า น ว ย ก า ร", "auto")).toEqual(["เร ี ย น ผู ้ อ ํ า น ว ย ก า ร"]);
  });
  it("replaces only the matching noisy line", () => {
    expect(replaceSelectedLines("ข้อความปกติ\nเร ี ย น ผู ้ อ ํ า น ว ย ก า ร\nข้อความท้าย", ["เรียน ผู้อำนวยการ"], "auto"))
      .toBe("ข้อความปกติ\nเรียน ผู้อำนวยการ\nข้อความท้าย");
  });
});
