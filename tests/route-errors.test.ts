import { beforeEach, describe, expect, it, vi } from "vitest";
const { summarizeDocument } = vi.hoisted(() => ({ summarizeDocument: vi.fn() }));
vi.mock("@/lib/ai/summarize", () => ({ summarizeDocument }));
import { POST } from "@/app/api/summarize/route";

describe("POST /api/summarize error paths", () => {
  beforeEach(() => { summarizeDocument.mockReset(); });
  it("rejects malformed JSON", async () => {
    const response = await POST(new Request("http://localhost/api/summarize", { method: "POST", body: "{" }));
    expect(response.status).toBe(400);
  });
  it("sanitizes provider errors", async () => {
    summarizeDocument.mockImplementationOnce(async () => { throw new Error("provider secret details"); });
    const response = await POST(new Request("http://localhost/api/summarize", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: "a".repeat(50), mode: "key_points" }) }));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Unable to summarize document" });
  });
});
