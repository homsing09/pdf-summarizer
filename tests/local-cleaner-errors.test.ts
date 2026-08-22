import { describe, expect, it } from "vitest";
import { localAiErrorMessage } from "../lib/ai/local-cleaner";

describe("localAiErrorMessage", () => {
  it("preserves useful WebGPU errors", () => expect(localAiErrorMessage(new Error("Browser ไม่รองรับ WebGPU"))).toContain("WebGPU"));
  it("hides minified implementation errors", () => expect(localAiErrorMessage(new TypeError("undefined is not a function"))).toContain("Chrome/Edge"));
});
