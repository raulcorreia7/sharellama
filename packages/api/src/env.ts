import { EnvSource } from "@sharellama/core/config";

import {
  type ApiConfig,
  clearConfigCache as clearCache,
  getConfig as parseConfig,
} from "./config/index.js";

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
