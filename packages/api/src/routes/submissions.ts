import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, asc, sql, and, gte } from "drizzle-orm";
import type { Env } from "../env";
import { getDb } from "../lib/db";
import { submissions } from "@locallama/db";
import {
  createSubmissionSchema,
  updateSubmissionSchema,
  listSubmissionsQuerySchema,
} from "@locallama/shared/schemas/submission";
import { rateLimitSubmission } from "../middleware/rateLimit";
import { verifyTurnstile } from "../middleware/turnstile";

const app = new Hono<{ Bindings: Env }>();

async function generateToken(length: number): Promise<string> {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, length);
}

async function hashFingerprint(fingerprint: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function sanitizeForResponse(
  submission: typeof submissions.$inferSelect
): Omit<typeof submissions.$inferSelect, "editToken"> {
  const { editToken: _, ...rest } = submission;
  return rest;
}

app.post(
  "/",
  rateLimitSubmission,
  verifyTurnstile(),
  zValidator("json", createSubmissionSchema),
  async (c) => {
    const db = getDb(c.env.DATABASE_URL);
    const data = c.req.valid("json");

    const fingerprint = c.req.header("X-Fingerprint");
    if (!fingerprint) {
      return c.json({ error: "Fingerprint required" }, 400);
    }

    const authorHash = await hashFingerprint(fingerprint);
    const editToken = await generateToken(32);

    const [submission] = await db
      .insert(submissions)
      .values({
        ...data,
        authorHash,
        editToken,
        tags: data.tags ?? [],
        updatedAt: new Date(),
      })
      .returning();

    if (!submission) {
      return c.json({ error: "Failed to create submission" }, 500);
    }

    const baseUrl = c.env.BASE_URL ?? new URL(c.req.url).origin;
    const adminLink = `${baseUrl}/submissions/${submission.id}/admin/${editToken}`;

    return c.json(
      {
        submission: sanitizeForResponse(submission),
        adminLink,
      },
      201
    );
  }
);

app.get("/", zValidator("query", listSubmissionsQuerySchema), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const query = c.req.valid("query");

  const { page, limit, sort, order, model, gpu, cpu, quantization, runtime, minTps } = query;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (model) conditions.push(sql`${submissions.modelName} ILIKE ${`%${model}%`}`);
  if (gpu) conditions.push(sql`${submissions.gpu} ILIKE ${`%${gpu}%`}`);
  if (cpu) conditions.push(sql`${submissions.cpu} ILIKE ${`%${cpu}%`}`);
  if (quantization) conditions.push(eq(submissions.quantization, quantization));
  if (runtime) conditions.push(eq(submissions.runtime, runtime));
  if (minTps !== undefined) conditions.push(gte(submissions.tokensPerSecond, minTps));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn = {
    score: submissions.score,
    createdAt: submissions.createdAt,
    tokensPerSecond: submissions.tokensPerSecond,
  }[sort];

  const orderByFn = order === "asc" ? asc : desc;

  const [results, countResult] = await Promise.all([
    db
      .select()
      .from(submissions)
      .where(whereClause)
      .orderBy(orderByFn(sortColumn))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(whereClause),
  ]);

  const total = Number(countResult[0]?.count ?? 0);

  return c.json({
    data: results.map(sanitizeForResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

app.get("/:id", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = parseInt(c.req.param("id"), 10);

  if (isNaN(id)) {
    return c.json({ error: "Invalid ID" }, 400);
  }

  const submission = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);

  if (!submission[0]) {
    return c.json({ error: "Submission not found" }, 404);
  }

  return c.json({ data: sanitizeForResponse(submission[0]) });
});

app.patch("/:id/admin/:token", zValidator("json", updateSubmissionSchema), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = parseInt(c.req.param("id"), 10);
  const token = c.req.param("token");

  if (isNaN(id)) {
    return c.json({ error: "Invalid ID" }, 400);
  }

  const existing = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);

  if (!existing[0]) {
    return c.json({ error: "Submission not found" }, 404);
  }

  if (existing[0].editToken !== token) {
    return c.json({ error: "Invalid admin token" }, 403);
  }

  const data = c.req.valid("json");

  const [updated] = await db
    .update(submissions)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(submissions.id, id))
    .returning();

  if (!updated) {
    return c.json({ error: "Failed to update submission" }, 500);
  }

  return c.json({ data: sanitizeForResponse(updated) });
});

app.delete("/:id/admin/:token", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const id = parseInt(c.req.param("id"), 10);
  const token = c.req.param("token");

  if (isNaN(id)) {
    return c.json({ error: "Invalid ID" }, 400);
  }

  const existing = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, id))
    .limit(1);

  if (!existing[0]) {
    return c.json({ error: "Submission not found" }, 404);
  }

  if (existing[0].editToken !== token) {
    return c.json({ error: "Invalid admin token" }, 403);
  }

  await db.delete(submissions).where(eq(submissions.id, id));

  return c.body(null, 204);
});

export default app;
