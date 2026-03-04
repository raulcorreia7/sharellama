#!/usr/bin/env node

type SmokeMode = "api" | "ui" | "all";

interface SmokeContext {
  apiUrl: string;
  uiUrl: string;
}

interface HttpJsonResult {
  status: number;
  data: unknown;
}

interface HttpTextResult {
  status: number;
  body: string;
}

class SmokeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmokeError";
  }
}

function parseMode(argv: string[]): SmokeMode {
  if (argv.includes("--api")) {
    return "api";
  }
  if (argv.includes("--ui")) {
    return "ui";
  }
  return "all";
}

function getContext(): SmokeContext {
  return {
    apiUrl: process.env.SMOKE_API_URL ?? process.env.API_URL ?? "http://localhost:8787",
    uiUrl: process.env.SMOKE_UI_URL ?? process.env.UI_URL ?? "http://localhost:3000",
  };
}

function toUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/+$/, "")}${path}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function fetchJson(url: string): Promise<HttpJsonResult> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  const text = await response.text();
  let data: unknown = null;

  if (text.length > 0) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new SmokeError(`Expected JSON but got non-JSON response from ${url}`);
    }
  }

  return { status: response.status, data };
}

async function fetchText(url: string): Promise<HttpTextResult> {
  const response = await fetch(url, {
    headers: { Accept: "text/html" },
  });
  return { status: response.status, body: await response.text() };
}

function assertStatus(label: string, status: number, expected: number): void {
  if (status !== expected) {
    throw new SmokeError(`${label} returned HTTP ${status} (expected ${expected})`);
  }
}

function assert(label: string, condition: boolean, detail: string): void {
  if (!condition) {
    throw new SmokeError(`${label} failed: ${detail}`);
  }
}

function printPass(label: string): void {
  console.log(`[smoke] PASS ${label}`);
}

async function runApiSmoke(context: SmokeContext): Promise<void> {
  const apiChecks: Array<{
    path: string;
    label: string;
    validate: (data: unknown) => boolean;
    detail: string;
  }> = [
    {
      path: "/health",
      label: "GET /health",
      validate: (data) => isRecord(data) && data.status === "ok",
      detail: "response.status should be 'ok'",
    },
    {
      path: "/submissions?page=1&limit=1&sort=createdAt&order=desc",
      label: "GET /submissions",
      validate: (data) => isRecord(data) && Array.isArray(data.data),
      detail: "response.data should be an array",
    },
    {
      path: "/models?page=1&limit=1&sort=configCount&order=desc",
      label: "GET /models",
      validate: (data) => isRecord(data) && Array.isArray(data.data),
      detail: "response.data should be an array",
    },
    {
      path: "/models/Qwen%2FQwen3.5-35B-A3B",
      label: "GET /models/:slug",
      validate: (data) => isRecord(data) && isRecord(data.data),
      detail: "response.data should be an object",
    },
    {
      path: "/hf/trending",
      label: "GET /hf/trending",
      validate: (data) => isRecord(data) && Array.isArray(data.models),
      detail: "response.models should be an array",
    },
  ];

  for (const check of apiChecks) {
    const url = toUrl(context.apiUrl, check.path);
    const result = await fetchJson(url);
    assertStatus(check.label, result.status, 200);
    assert(check.label, check.validate(result.data), check.detail);
    printPass(check.label);
  }
}

function extractModelHref(modelsHtml: string): string | null {
  const match = modelsHtml.match(/href="(\/models\/[^"?#]+\/[^"?#]+)"/);
  return match?.[1] ?? null;
}

async function runUiSmoke(context: SmokeContext): Promise<void> {
  const homepage = await fetchText(toUrl(context.uiUrl, "/"));
  assertStatus("GET /", homepage.status, 200);
  assert("GET /", homepage.body.includes("ShareLlama"), "expected ShareLlama content");
  printPass("GET /");

  const modelsPage = await fetchText(toUrl(context.uiUrl, "/models"));
  assertStatus("GET /models", modelsPage.status, 200);
  assert("GET /models", modelsPage.body.includes("Browse Models"), "expected Browse Models content");
  printPass("GET /models");

  const modelHref = extractModelHref(modelsPage.body) ?? "/models/Qwen/Qwen3.5-35B-A3B";
  const modelPage = await fetchText(toUrl(context.uiUrl, modelHref));
  assertStatus(`GET ${modelHref}`, modelPage.status, 200);
  assert(
    `GET ${modelHref}`,
    modelPage.body.includes("ShareLlama"),
    "expected app shell/title to render",
  );
  printPass(`GET ${modelHref}`);
}

async function main(): Promise<void> {
  const mode = parseMode(process.argv.slice(2));
  const context = getContext();

  console.log(
    `[smoke] Starting (${mode}) with API=${context.apiUrl} UI=${context.uiUrl}`,
  );

  if (mode === "api" || mode === "all") {
    await runApiSmoke(context);
  }

  if (mode === "ui" || mode === "all") {
    await runUiSmoke(context);
  }

  console.log("[smoke] PASS");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[smoke] FAIL ${message}`);
  process.exit(1);
});

