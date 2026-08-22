import { z } from "zod";
export const summaryModes = ["key_points", "short_summary", "action_items"] as const;
export const summarizeSchema = z.object({
  text: z.string().trim().min(50, "Document text is too short").max(120_000, "Document text is too large"),
  mode: z.enum(summaryModes),
}).strict();
export type SummarizeInput = z.infer<typeof summarizeSchema>;
export type SummaryMode = SummarizeInput["mode"];
