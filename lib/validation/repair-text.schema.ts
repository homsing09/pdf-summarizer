import { z } from "zod";

export const repairTextSchema = z.object({
  chunks: z.array(z.string().trim().min(1).max(2_000)).min(1).max(20),
}).strict();

export type RepairTextInput = z.infer<typeof repairTextSchema>;
