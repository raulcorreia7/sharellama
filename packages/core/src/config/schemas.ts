import { z } from "zod";

export const environmentSchema = z.enum(["development", "staging", "production", "test"]);

export const serverSchema = z.object({
  port: z.coerce.number().int().positive().default(8787),
  host: z.string().default("0.0.0.0"),
  env: environmentSchema.default("development"),
});

export const dbSchema = z.object({
  url: z.string().min(1, "DB_URL is required"),
  testUrl: z.string().optional(),
  pool_size: z.coerce.number().int().positive().default(10),
});

export const authSchema = z.object({
  turnstileSecret: z.string().optional(),
  turnstileSiteKey: z.string().optional(),
});

export const hfSchema = z.object({
  token: z.string().optional(),
});

export type Environment = z.infer<typeof environmentSchema>;
export type ServerConfig = z.infer<typeof serverSchema>;
export type DbConfig = z.infer<typeof dbSchema>;
export type AuthConfig = z.infer<typeof authSchema>;
export type HfConfig = z.infer<typeof hfSchema>;
