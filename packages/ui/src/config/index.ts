import { z } from "zod";
import { createConfig, EnvSource } from "@sharellama/core/config";

const configSchema = z.object({
  api: z.object({
    url: z.string().url().default("http://localhost:8787"),
  }),
  baseUrl: z.string().url().optional(),
  auth: z.object({
    turnstileSiteKey: z.string().default(""),
  }),
});

export type UiConfig = z.infer<typeof configSchema>;

function getViteEnv(): Record<string, string | undefined> {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return {
      API_URL: import.meta.env.VITE_API_URL,
      BASEURL: import.meta.env.VITE_BASE_URL,
      AUTH_TURNSTILESITEKEY: import.meta.env.VITE_TURNSTILE_SITE_KEY,
    };
  }
  return {};
}

let cachedConfig: UiConfig | undefined;

export function getConfig(): UiConfig {
  if (cachedConfig) {
    return cachedConfig;
  }
  const source = EnvSource.fromObject(getViteEnv());
  cachedConfig = createConfig(configSchema, source);
  return cachedConfig;
}

export function clearConfigCache(): void {
  cachedConfig = undefined;
}

export const getUiConfig = getConfig;
export const clearUiConfigCache = clearConfigCache;
export const config = getConfig();
