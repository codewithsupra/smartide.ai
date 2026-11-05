import { z } from "zod";

export const quickEditRequestSchema = z.object({
  selectedCode: z.string().max(50000),
  fullCode: z.string().max(200000),
  documentation: z.string().max(50000).optional().default(""),
  instruction: z.string().trim().min(1).max(10000),
});

export const quickEditResponseSchema = z.object({
  editedCode: z.string().describe("The edited version of the selected code"),
});
