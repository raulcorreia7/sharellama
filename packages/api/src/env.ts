import {
  getConfig as parseConfig,
  clearConfigCache as clearCache,
  type ApiConfig,
} from "./config/index.js";
import { EnvSource } from "@sharellama/core/config";

export type { ApiConfig as Config } from "./config/index.js";
export type Env = Record<string, string | undefined>;

export function getConfig(env?: Env): ApiConfig {
  if (env) {
    return parseConfig(EnvSource.fromObject(env));
  }
  return parseConfig();
}

export function clearConfigCache(): void {
  clearCache();
}
