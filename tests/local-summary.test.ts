import { describe, expect, it } from "vitest";
import { summarizeKeyPointsLocally } from "@/lib/ai/local-summary";

describe("summarizeKeyPointsLocally", () => {
  it("prioritizes action-oriented and numeric lines without cloud AI", () => {
    const result = summarizeKeyPointsLocally("บทนำเกี่ยวกับเอกสารฉบับนี้ซึ่งมีรายละเอียดทั่วไป\nผลการดำเนินงานสำคัญเพิ่มขึ้น 25 เปอร์เซ็นต์\nควรดำเนินการตรวจสอบอีกครั้งภายในเดือนหน้า", 2);
    expect(result).toContain("25 เปอร์เซ็นต์");
    expect(result).toContain("ควรดำเนินการ");
  });

  it("removes duplicate lines", () => {
    const line = "This is an important result for the monthly report.";
    expect(summarizeKeyPointsLocally(`${line}\n${line}`).split("\n")).toHaveLength(1);
  });
});
