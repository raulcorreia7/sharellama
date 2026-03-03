import { z } from "zod";

export const createModelSchema = z.object({
  slug: z.string().min(1).max(255),
});

export const createModelSpecSchema = z.object({
  sourceType: z.enum(["hf_readme", "user_submit", "unsloth", "official", "reddit"]),
  sourceUrl: z.string().url().optional(),

  architecture: z.string().max(100).optional(),
  parameterCount: z.string().max(50).optional(),
  activeParameters: z.string().max(50).optional(),
  layers: z.number().int().positive().optional(),
  hiddenSize: z.number().int().positive().optional(),
  attentionHeads: z.number().int().positive().optional(),
  kvHeads: z.number().int().positive().optional(),
  headDim: z.number().int().positive().optional(),
  contextWindow: z.number().int().positive().optional(),
  attentionType: z.string().max(100).optional(),

  multimodal: z.boolean().optional(),
  supportedModalities: z.array(z.string()).optional(),

  minVramQ4: z.number().positive().optional(),
  minVramQ6: z.number().positive().optional(),
  minVramQ8: z.number().positive().optional(),
  recommendedGpu: z.string().max(200).optional(),

  defaultParams: z
    .object({
      temp: z.number().min(0).max(2),
      topP: z.number().min(0).max(1),
      topK: z.number().int().positive(),
      minP: z.number().min(0).max(1).optional(),
    })
    .optional(),

  thinkingModeParams: z
    .object({
      temp: z.number().min(0).max(2),
      topP: z.number().min(0).max(1),
      topK: z.number().int().positive(),
    })
    .optional(),

  redditPosts: z
    .array(
      z.object({
        title: z.string(),
        url: z.string().url(),
        upvotes: z.number().optional(),
        date: z.string().optional(),
      }),
    )
    .optional(),

  llamaCppCommand: z.string().max(5000).optional(),
  vllmCommand: z.string().max(5000).optional(),
  ollamaModelfile: z.string().max(5000).optional(),

  isPrimary: z.boolean().optional(),
});

export const updateModelSpecSchema = createModelSpecSchema.partial();

export type CreateModelSpecInput = z.infer<typeof createModelSpecSchema>;
export type UpdateModelSpecInput = z.infer<typeof updateModelSpecSchema>;

export interface ModelSpec extends CreateModelSpecInput {
  modelSlug: string;
  submittedBy: string;
  submittedAt: string;
  updatedAt?: string;
  isVerified?: boolean;
  isPrimary?: boolean;
}

export const listModelsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  sort: z.enum(["configCount", "createdAt"]).default("configCount"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateModelInput = z.infer<typeof createModelSchema>;
export type ListModelsQuery = z.infer<typeof listModelsQuerySchema>;

export interface Model {
  slug: string;
  name: string;
  org: string | null;
  orgAvatar: string | null;
  configCount: number;
  downloads: number | null;
  likes: number | null;
  lastValidated: string | null;
  createdAt: string;
}

export interface HFModelResult {
  id: string;
  modelId: string;
  author: string;
  downloads: number;
  likes: number;
  pipeline_tag: string | null;
  library_name: string | null;
}

export interface QuantRepo {
  id: string;
  provider: string;
  downloads: number;
  likes: number;
  quantType: string | null;
  url: string;
}

export interface QuantFile {
  name: string;
  filename: string;
  sizeBytes: number;
  url: string;
}
