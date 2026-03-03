import { z } from "zod";

export const submissionSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  cpu: z.string().max(200).optional(),
  gpu: z.string().max(200).optional(),
  ramGb: z.number().int().positive().optional(),
  vramGb: z.number().int().positive().optional(),
  runtime: z.string().min(1).max(50),
  runtimeVersion: z.string().max(50).optional(),
  modelSlug: z.string().min(1).max(255),
  quantization: z.string().max(50).optional(),
  quantSource: z.string().max(200).optional(),
  quantUrl: z.string().max(500).optional(),
  contextLength: z.number().int().positive().optional(),
  command: z.string().optional(),
  inferenceParams: z.record(z.string(), z.unknown()).optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().positive().optional(),
  minP: z.number().min(0).max(1).optional(),
  repeatPenalty: z.number().min(0).max(2).optional(),
  mirostat: z.number().int().min(0).max(2).optional(),
  mirostatTau: z.number().positive().optional(),
  mirostatEta: z.number().positive().optional(),
  seed: z.number().int().optional(),
  tokensPerSecond: z.number().positive().optional(),
  latencyMs: z.number().int().positive().optional(),
  memoryMb: z.number().int().positive().optional(),
  tags: z.array(z.string()).optional(),
});

export const submissionUpdateSchema = submissionSchema.partial().omit({ modelSlug: true });

export type SubmissionInput = z.infer<typeof submissionSchema>;
export type SubmissionUpdate = z.infer<typeof submissionUpdateSchema>;

export interface Submission {
  id: number;
  authorHash: string;
  title: string;
  description: string | null;
  cpu: string | null;
  gpu: string | null;
  ramGb: number | null;
  vramGb: number | null;
  runtime: string;
  runtimeVersion: string | null;
  modelSlug: string;
  quantization: string | null;
  quantSource: string | null;
  quantUrl: string | null;
  contextLength: number | null;
  command: string | null;
  inferenceParams: Record<string, unknown> | null;
  temperature: number | null;
  topP: number | null;
  topK: number | null;
  minP: number | null;
  repeatPenalty: number | null;
  mirostat: number | null;
  mirostatTau: number | null;
  mirostatEta: number | null;
  seed: number | null;
  tokensPerSecond: number | null;
  latencyMs: number | null;
  memoryMb: number | null;
  tags: string[];
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  message?: string;
}

export * from "./config/index.js";
export * from "./schemas/comment.js";
export * from "./schemas/model.js";
export { createModelSpecSchema, updateModelSpecSchema } from "./schemas/model.js";
export * from "./schemas/submission.js";
export * from "./schemas/vote.js";
