import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ create: vi.fn(), gemini: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/ai/groq.server", () => ({ GROQ_MODEL: "test-model", getGroqClient: () => ({ chat: { completions: { create: mocks.create } } }) }));
vi.mock("@/lib/ai/gemini.server", () => ({ generateWithGemini: mocks.gemini }));
import { summarizeDocument } from "@/lib/ai/summarize";

const input = { text: "เอกสารสำหรับทดสอบการสรุปที่มีความยาวเพียงพอและมีรายละเอียดสำคัญสำหรับระบบ", mode: "key_points" as const };

describe("cloud provider failover", () => {
  beforeEach(() => { mocks.create.mockReset(); mocks.gemini.mockReset(); });
  it("uses Groq when the primary provider succeeds", async () => {
    mocks.create.mockResolvedValue({ choices: [{ message: { content: "ผลจาก Groq" } }] });
    await expect(summarizeDocument(input)).resolves.toEqual({ summary: "ผลจาก Groq", provider: "Groq" });
    expect(mocks.gemini).not.toHaveBeenCalled();
  });
  it("fails over to Gemini on quota exhaustion", async () => {
    mocks.create.mockRejectedValue(Object.assign(new Error("rate limited"), { status: 429 }));
    mocks.gemini.mockResolvedValue("ผลจาก Gemini");
    await expect(summarizeDocument(input)).resolves.toEqual({ summary: "ผลจาก Gemini", provider: "Gemini" });
  });
  it("does not fail over for an invalid request", async () => {
    const invalid = Object.assign(new Error("bad request"), { status: 400 });
    mocks.create.mockRejectedValue(invalid);
    await expect(summarizeDocument(input)).rejects.toBe(invalid);
    expect(mocks.gemini).not.toHaveBeenCalled();
  });
});
