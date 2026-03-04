#!/usr/bin/env node
import { execSync, spawn, spawnSync } from "child_process";
import { config } from "dotenv";
import { existsSync, unlinkSync, writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "..", ".env") });

const port = process.env.SERVER_PORT ?? "8787";
const rootDir = resolve(__dirname, "..", "..", "..");

function runRootCommand(command, args, label) {
  console.log(`[dev] ${label}...`);
  const result = spawnSync(command, args, {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function releasePortIfBusy(portToRelease) {
  const allowedProcessPatterns = [/workerd/i, /wrangler/i, /node.*scripts\/dev\.mjs/i];

  try {
    const output = execSync(`lsof -tiTCP:${portToRelease} -sTCP:LISTEN`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (!output) {
      return;
    }

    const pids = output
      .split("\n")
      .map((value) => Number.parseInt(value, 10))
      .filter((pid) => Number.isInteger(pid) && pid !== process.pid);

    if (pids.length === 0) {
      return;
    }

    console.log(`[dev] Releasing port ${portToRelease} from process(es): ${pids.join(", ")}`);
    for (const pid of pids) {
      try {
        const command = execSync(`ps -p ${pid} -o args=`, {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "ignore"],
        }).trim();

        if (!allowedProcessPatterns.some((pattern) => pattern.test(command))) {
          console.error(
            `[dev] Port ${portToRelease} is in use by non-dev process (${pid}): ${command}`,
          );
          process.exit(1);
        }

        process.kill(pid, "SIGTERM");
      } catch {
        // Ignore failures (already exited / permissions).
      }
    }

    // Wait briefly for process teardown before starting wrangler.
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const stillListening = spawnSync(
        "bash",
        ["-lc", `lsof -tiTCP:${portToRelease} -sTCP:LISTEN >/dev/null`],
        { stdio: "ignore" },
      );
      if (stillListening.status !== 0) {
        return;
      }
      spawnSync("bash", ["-lc", "sleep 0.25"], { stdio: "ignore" });
    }
  } catch {
    // No listener on this port or lsof unavailable.
  }
}

runRootCommand("pnpm", ["db:up"], "Ensuring database is running");
runRootCommand("pnpm", ["db:push"], "Applying database schema");
releasePortIfBusy(port);

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
