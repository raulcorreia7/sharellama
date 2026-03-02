import { z } from "zod";
import { createConfig, EnvSource } from "@sharellama/core/config";
import { serverSchema, dbSchema, authSchema, hfSchema } from "@sharellama/core/config/schemas";

const apiSchema = z.object({
  baseUrl: z.string().optional(),
});

const configSchema = z.object({
  server: serverSchema,
  db: dbSchema,
  auth: authSchema,
  hf: hfSchema,
  api: apiSchema,
});

export type ApiConfig = z.infer<typeof configSchema>;

let cachedConfig: ApiConfig | null = null;

export function getConfig(source?: EnvSource): ApiConfig {
  if (cachedConfig && !source) {
    return cachedConfig;
  }
  const config = createConfig(configSchema, source ?? EnvSource.fromProcess());
  if (!source) {
    cachedConfig = config;
  }
  return config;
}

export function clearConfigCache(): void {
  cachedConfig = null;
}
