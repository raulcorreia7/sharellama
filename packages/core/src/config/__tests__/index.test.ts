import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createConfig, EnvSource } from "../index.js";

describe("EnvSource", () => {
  it("gets value from env", () => {
    const source = new EnvSource({ PORT: "3000" });
    expect(source.get("PORT")).toBe("3000");
  });

  it("returns undefined for missing key", () => {
    const source = new EnvSource({});
    expect(source.get("MISSING")).toBeUndefined();
  });

  it("fromProcess creates source from process.env", () => {
    process.env.TEST_VAR = "test_value";
    const source = EnvSource.fromProcess();
    expect(source.get("TEST_VAR")).toBe("test_value");
    delete process.env.TEST_VAR;
  });

  it("fromObject creates source from object", () => {
    const source = EnvSource.fromObject({ KEY: "value" });
    expect(source.get("KEY")).toBe("value");
  });
});

describe("createConfig", () => {
  it("parses flat config", () => {
    const schema = z.object({ port: z.coerce.number() });
    const config = createConfig(schema, { PORT: "3000" });
    expect(config.port).toBe(3000);
  });

  it("parses nested config from flat env vars", () => {
    const schema = z.object({
      server: z.object({
        port: z.coerce.number(),
        host: z.string(),
      }),
    });
    const config = createConfig(schema, { SERVER_PORT: "3000", SERVER_HOST: "localhost" });
    expect(config.server.port).toBe(3000);
    expect(config.server.host).toBe("localhost");
  });

  it("applies defaults", () => {
    const schema = z.object({ port: z.coerce.number().default(8787) });
    const config = createConfig(schema, {});
    expect(config.port).toBe(8787);
  });

  it("throws on validation error", () => {
    const schema = z.object({ port: z.coerce.number() });
    expect(() => createConfig(schema, { PORT: "invalid" })).toThrow();
  });

  it("throws on missing required field", () => {
    const schema = z.object({ url: z.string().min(1) });
    expect(() => createConfig(schema, {})).toThrow();
  });

  it("supports optional fields", () => {
    const schema = z.object({
      required: z.string(),
      optional: z.string().optional(),
    });
    const config = createConfig(schema, { REQUIRED: "value" });
    expect(config.required).toBe("value");
    expect(config.optional).toBeUndefined();
  });

  it("parses boolean strings", () => {
    const schema = z.object({ enabled: z.boolean() });
    const configTrue = createConfig(schema, { ENABLED: "true" });
    const configFalse = createConfig(schema, { ENABLED: "false" });
    expect(configTrue.enabled).toBe(true);
    expect(configFalse.enabled).toBe(false);
  });

  it("parses number strings", () => {
    const schema = z.object({
      port: z.number(),
      ratio: z.number(),
    });
    const config = createConfig(schema, { PORT: "8080", RATIO: "3.14" });
    expect(config.port).toBe(8080);
    expect(config.ratio).toBe(3.14);
  });

  it("handles two-level nesting", () => {
    const schema = z.object({
      db: z.object({
        url: z.string(),
        pool_size: z.coerce.number(),
      }),
    });
    const config = createConfig(schema, { DB_URL: "postgres://localhost", DB_POOL_SIZE: "10" });
    expect(config.db.url).toBe("postgres://localhost");
    expect(config.db.pool_size).toBe(10);
  });
});

describe("integration", () => {
  it("combines EnvSource with createConfig", () => {
    const schema = z.object({
      server: z.object({
        port: z.coerce.number().default(3000),
        host: z.string().default("localhost"),
      }),
    });

    const source = new EnvSource({ SERVER_PORT: "8080" });
    const config = createConfig(schema, source);

    expect(config.server.port).toBe(8080);
    expect(config.server.host).toBe("localhost");
  });
});
