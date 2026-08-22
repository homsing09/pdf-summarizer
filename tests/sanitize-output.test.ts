import { describe, expect, it } from "vitest";
import { sanitizeModelOutput } from "@/lib/ai/sanitize-output";

describe("sanitizeModelOutput", () => {
  it("removes model reasoning blocks", () => {
    expect(sanitizeModelOutput("<think>private reasoning</think>\n\nFinal summary")).toBe("Final summary");
  });

  it("leaves normal summaries unchanged", () => {
    expect(sanitizeModelOutput("A concise summary.")).toBe("A concise summary.");
  });
});
