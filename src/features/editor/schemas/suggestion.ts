import { z } from "zod";

export const suggestionRequestSchema = z.object({
  fileName: z.string().min(1).max(256),
  prefix: z.string().max(10000),
  suffix: z.string().max(3000),
});

export const suggestionResponseSchema = z.object({
  suggestion: z.string(),
});

export const suggestionErrorSchema = z.object({
  error: z.string(),
  detail: z.string().optional(),
  providerStatus: z.number().optional(),
});
