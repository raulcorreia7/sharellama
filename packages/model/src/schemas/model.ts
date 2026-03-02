import { z } from "zod";

export const createModelSchema = z.object({
  slug: z.string().min(1).max(255),
});

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
  configCount: number;
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
