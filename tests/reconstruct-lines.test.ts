import { describe, expect, it } from "vitest";
import { reconstructLines } from "@/lib/pdf/reconstruct-lines";

describe("reconstructLines", () => {
  it("sorts PDF text by visual line and horizontal position", () => {
    expect(reconstructLines([
      { text: "โลก", x: 30, y: 80, width: 18, height: 10 },
      { text: "บรรทัดสอง", x: 10, y: 60, width: 50, height: 10 },
      { text: "สวัสดี", x: 10, y: 80, width: 18, height: 10 },
    ])).toBe("สวัสดี โลก\nบรรทัดสอง");
  });

  it("joins glyphs whose visual gap is inside a word", () => {
    expect(reconstructLines([
      { text: "ไฟ", x: 10, y: 80, width: 10, height: 10 },
      { text: "ฟ้า", x: 20.5, y: 80, width: 10, height: 10 },
    ])).toBe("ไฟฟ้า");
  });
});
