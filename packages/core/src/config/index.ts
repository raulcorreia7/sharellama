import { z } from "zod";

export interface ConfigSource {
  get(key: string): string | undefined;
}

export class EnvSource implements ConfigSource {
  constructor(private env: Record<string, string | undefined>) {}

  get(key: string): string | undefined {
    return this.env[key];
  }

  static fromProcess(): EnvSource {
    return new EnvSource(process.env);
  }

  static fromObject(obj: Record<string, string | undefined>): EnvSource {
    return new EnvSource(obj);
  }
}

function isConfigSource(source: unknown): source is ConfigSource {
  return source instanceof EnvSource;
}

function parseValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    const num = parseFloat(value);
    return Number.isInteger(num) ? parseInt(value, 10) : num;
  }
  return value;
}

function setNestedValue(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let current = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]!;
    if (!current[key]) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[path[path.length - 1]!] = value;
}

export function createConfig<T extends z.ZodTypeAny>(
  schema: T,
  source: ConfigSource | Record<string, string | undefined>,
): z.infer<T> {
  const envSource = isConfigSource(source) ? source : new EnvSource(source);
  const result: Record<string, unknown> = {};

  function extractPathsFromSchema(schemaObj: z.ZodTypeAny, prefix: string[] = []): string[][] {
    const paths: string[][] = [];

    if (schemaObj instanceof z.ZodObject) {
      for (const [key, value] of Object.entries(schemaObj.shape)) {
        const nestedSchema = value as z.ZodTypeAny;
        const currentPath = [...prefix, key];

        if (nestedSchema instanceof z.ZodObject) {
          paths.push(...extractPathsFromSchema(nestedSchema, currentPath));
        } else {
          paths.push(currentPath);
        }
      }
    }

    return paths;
  }

  const paths = extractPathsFromSchema(schema);

  for (const path of paths) {
    const envKey = path.join("_").toUpperCase();
    const value = envSource.get(envKey);

    if (value !== undefined) {
      setNestedValue(result, path, parseValue(value));
    }
  }

  return schema.parse(result);
}
