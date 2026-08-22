import { beforeEach, describe, expect, it } from "vitest";
import { checkRateLimit, clientIdentifier, resetRateLimitsForTests } from "@/lib/api/rate-limit";
import { isBodyTooLarge, readBoundedJson, withTimeout } from "@/lib/api/request-guards";

describe("API abuse guards", () => {
  beforeEach(resetRateLimitsForTests);

  it("blocks requests after the configured limit", () => {
    expect(checkRateLimit("client", 2, 60_000, 1_000).allowed).toBe(true);
    expect(checkRateLimit("client", 2, 60_000, 1_001).allowed).toBe(true);
    expect(checkRateLimit("client", 2, 60_000, 1_002).allowed).toBe(false);
  });

  it("starts a fresh window after reset time", () => {
    checkRateLimit("client", 1, 1_000, 1_000);
    expect(checkRateLimit("client", 1, 1_000, 2_001).allowed).toBe(true);
  });

  it("prefers Vercel's forwarded client address", () => {
    const request = new Request("https://example.test", { headers: { "x-vercel-forwarded-for": "203.0.113.1, 10.0.0.1" } });
    expect(clientIdentifier(request)).toBe("203.0.113.1");
  });

  it("rejects a body declared above the limit", () => {
    expect(isBodyTooLarge(new Request("https://example.test", { headers: { "content-length": "101" } }), 100)).toBe(true);
  });

  it("stops streamed JSON that exceeds the boundary without content-length", async () => {
    const request = new Request("https://example.test", { method: "POST", body: JSON.stringify({ text: "x".repeat(101) }) });
    await expect(readBoundedJson(request, 100)).rejects.toThrow("too large");
  });

  it("times out a stalled provider operation", async () => {
    await expect(withTimeout(() => new Promise(() => undefined), 5)).rejects.toThrow("timed out");
  });
});
