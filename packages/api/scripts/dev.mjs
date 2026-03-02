#!/usr/bin/env node
import { spawn } from "child_process";
import { config } from "dotenv";
import { existsSync, unlinkSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env") });

const port = process.env.SERVER_PORT ?? "8787";

const devVarsContent = [
  `SERVER_PORT=${port}`,
  `SERVER_HOST=${process.env.SERVER_HOST ?? "0.0.0.0"}`,
  `SERVER_ENV=${process.env.SERVER_ENV ?? "development"}`,
  `DB_URL=${process.env.DB_URL ?? ""}`,
  `DB_TESTURL=${process.env.DB_TESTURL ?? ""}`,
  `DB_POOL_SIZE=${process.env.DB_POOL_SIZE ?? ""}`,
  `API_BASEURL=${process.env.API_BASEURL ?? ""}`,
  `AUTH_TURNSTILESECRET=${process.env.AUTH_TURNSTILESECRET ?? ""}`,
  `HF_TOKEN=${process.env.HF_TOKEN ?? ""}`,
].join("\n");

const devVarsPath = resolve(__dirname, "..", ".dev.vars");
writeFileSync(devVarsPath, devVarsContent);

const child = spawn("npx", ["wrangler", "dev", "--port", port], {
  stdio: "inherit",
  cwd: resolve(__dirname, ".."),
});

const cleanup = () => {
  if (existsSync(devVarsPath)) {
    unlinkSync(devVarsPath);
  }
};

child.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  cleanup();
  process.exit(0);
});
