import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { Hono } from "hono";
import type { Env } from "./env";
import { rateLimit } from "./middleware/rateLimit";
import { verifyTurnstile } from "./middleware/turnstile";

const app = new Hono<{ Bindings: Env }>();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "X-Turnstile-Token"],
  })
);

app.onError((err, c) => {
  console.error("Error:", err);
  return c.json(
    {
      error: "Internal Server Error",
      message: err.message,
    },
    500
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

export default app;
