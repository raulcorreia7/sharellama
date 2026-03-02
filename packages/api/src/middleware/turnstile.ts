import type { Context, MiddlewareHandler } from "hono";
import { getConfig, type Env } from "../env";

interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  error_codes?: string[];
}

async function verifyWithCloudflare(secret: string, token: string): Promise<boolean> {
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      secret,
      response: token,
    }),
  });

  if (!response.ok) {
    return false;
  }

  const result = (await response.json()) as TurnstileVerifyResponse;
  return result.success === true;
}

export function verifyTurnstile(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c: Context<{ Bindings: Env }>, next) => {
    let token: string | undefined = c.req.header("X-Turnstile-Token");

    if (!token) {
      try {
        const body = await c.req.json<{ turnstileToken?: string }>();
        token = body?.turnstileToken;
      } catch {
        // Body not parseable or missing
      }
    }

    if (!token) {
      return c.json({ error: "Turnstile token required", code: "TURNSTILE_MISSING" }, 400);
    }

    const config = getConfig(c.env);
    const secret = config.auth.turnstileSecret;
    if (!secret) {
      console.error("AUTH_TURNSTILE_SECRET_KEY not configured");
      return c.json({ error: "Turnstile not configured", code: "TURNSTILE_CONFIG_ERROR" }, 500);
    }

    const isValid = await verifyWithCloudflare(secret, token);
    if (!isValid) {
      return c.json({ error: "Turnstile verification failed", code: "TURNSTILE_FAILED" }, 400);
    }

    await next();
  };
}
