import { z } from "zod";

export const createSubmissionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  cpu: z.string().max(200).optional(),
  gpu: z.string().max(200).optional(),
  ramGb: z.number().int().positive().optional(),
  runtime: z.string().min(1).max(50),
  runtimeVersion: z.string().max(50).optional(),
  modelName: z.string().min(1).max(100),
  quantization: z.string().max(50).optional(),
  contextLength: z.number().int().positive().optional(),
  command: z.string().max(2000).optional(),
  inferenceParams: z.record(z.unknown()).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().positive().optional(),
  minP: z.number().min(0).max(1).optional(),
  repeatPenalty: z.number().min(0).max(10).optional(),
  mirostat: z.number().int().min(0).max(2).optional(),
  mirostatTau: z.number().min(0).max(10).optional(),
  mirostatEta: z.number().min(0).max(1).optional(),
  seed: z.number().int().optional(),
  tokensPerSecond: z.number().positive().optional(),
  latencyMs: z.number().int().positive().optional(),
  memoryMb: z.number().int().positive().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const updateSubmissionSchema = createSubmissionSchema.partial();

export const listSubmissionsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z.enum(["score", "createdAt", "tokensPerSecond"]).default("createdAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  model: z.string().optional(),
  gpu: z.string().optional(),
  cpu: z.string().optional(),
  quantization: z.string().optional(),
  runtime: z.string().optional(),
  minTps: z.coerce.number().positive().optional(),
  maxTps: z.coerce.number().positive().optional(),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;
export type UpdateSubmissionInput = z.infer<typeof updateSubmissionSchema>;
export type ListSubmissionsQuery = z.infer<typeof listSubmissionsQuerySchema>;
