import type { Context, MiddlewareHandler } from "hono";

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

export async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex.slice(0, 16);
}

function getClientIP(c: Context): string {
  const forwarded = c.req.header("X-Forwarded-For");
  if (forwarded) {
    const ips = forwarded.split(",");
    return ips[0]?.trim() ?? "unknown";
  }
  return "unknown";
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const { windowMs, max } = options;

  return async (c, next) => {
    cleanupExpiredEntries();

    const ip = getClientIP(c);
    const hashedIP = await hashIP(ip);
    const now = Date.now();
    const resetTime = now + windowMs;

    let entry = rateLimitStore.get(hashedIP);

    if (!entry || now > entry.resetTime) {
      entry = { count: 0, resetTime };
    }

    entry.count++;
    rateLimitStore.set(hashedIP, entry);

    const remaining = Math.max(0, max - entry.count);
    const resetSeconds = Math.ceil((entry.resetTime - now) / 1000);

    c.header("X-RateLimit-Limit", String(max), { append: false });
    c.header("X-RateLimit-Remaining", String(remaining), { append: false });
    c.header("X-RateLimit-Reset", String(resetSeconds), { append: false });

    if (entry.count > max) {
      return c.json({ error: "Too many requests" }, 429);
    }

    await next();
  };
}

export const rateLimitSubmission = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
});

export const rateLimitComment = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
});

export const rateLimitVote = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
});
