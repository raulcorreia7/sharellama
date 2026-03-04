import { getDb } from "./lib/db";
import { logError, logInfo, logWarn } from "./lib/logging";
import { checkAndRunTasks } from "./lib/tasks";
import { rateLimit } from "./middleware/rateLimit";
import { verifyTurnstile } from "./middleware/turnstile";
import { commentsRoutes, submissionCommentsRoutes } from "./routes/comments";
import huggingfaceRoutes from "./routes/huggingface";
import modelsRoutes from "./routes/models";
import submissionsRoutes from "./routes/submissions";
import votesRoutes from "./routes/votes";
import type { Env } from "./env";
import { getConfig } from "./env";

import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  const startTime = performance.now();

  c.header("X-Request-Id", requestId);

  try {
    await next();
  } finally {
    const status = c.res.status;
    const context = {
      requestId,
      method: c.req.method,
      path: c.req.path,
      status,
      durationMs: Number((performance.now() - startTime).toFixed(2)),
    };

    if (status >= 500) {
      logError("http.request", context);
    } else if (status >= 400) {
      logWarn("http.request", context);
    } else {
      logInfo("http.request", context);
    }
  }
});
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Turnstile-Token", "X-Fingerprint"],
  }),
);

app.use("*", async (c, next) => {
  const config = getConfig(c.env);
  const db = getDb(config.db.url);

  if (c.executionCtx?.waitUntil) {
    c.executionCtx.waitUntil(checkAndRunTasks(db, c.env));
  }

  return next();
});

app.onError((err, c) => {
  const requestId = c.res.headers.get("X-Request-Id") ?? c.req.header("x-request-id") ?? "unknown";
  logError("Unhandled API error", {
    requestId,
    method: c.req.method,
    path: c.req.path,
    error: err,
  });

  return c.json(
    {
      error: "Internal Server Error",
      message: err.message,
      requestId,
    },
    500,
  );
});

app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (c) => c.json({ status: "ok" }));

app.post("/test/turnstile", verifyTurnstile(), (c) => {
  return c.json({ verified: true });
});

const testRateLimit = rateLimit({ windowMs: 60 * 1000, max: 3 });
let requestCount = 0;

app.get("/test/rate-limit", testRateLimit, (c) => {
  requestCount++;
  return c.json({ count: requestCount });
});

app.route("/hf", huggingfaceRoutes);
app.route("/models", modelsRoutes);
app.route("/submissions", submissionsRoutes);
app.route("/submissions", votesRoutes);
app.route("/submissions", submissionCommentsRoutes);
app.route("/comments", commentsRoutes);

export default app;
