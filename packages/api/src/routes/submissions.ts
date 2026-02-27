import { Hono, type Context } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, asc, sql, and, gte, lte, or } from "drizzle-orm";
import type { Env } from "../env";
import { getDb } from "../lib/db";
import { submissions, votes } from "@locallama/db";
import {
  createSubmissionSchema,
  updateSubmissionSchema,
  listSubmissionsQuerySchema,
} from "@locallama/shared/schemas/submission";
import type { VoteValue } from "@locallama/shared/schemas/vote";
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

async function getVoterHash(c: Context<{ Bindings: Env }>): Promise<string | null> {
  const fingerprint = c.req.header("X-Fingerprint");
  if (!fingerprint) return null;
  return hashFingerprint(fingerprint);
}

async function getUserVote(
  db: ReturnType<typeof getDb>,
  voterHash: string,
  submissionId: number
): Promise<VoteValue | null> {
  const vote = await db
    .select()
    .from(votes)
    .where(and(eq(votes.voterHash, voterHash), eq(votes.submissionId, submissionId)))
    .limit(1);
  return (vote[0]?.value as VoteValue) ?? null;
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

  const { page, limit, sort, order, q, model, gpu, cpu, quantization, runtime, minTps, maxTps } =
    query;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (q) {
    const searchPattern = `%${q}%`;
    conditions.push(
      or(
        sql`${submissions.title} ILIKE ${searchPattern}`,
        sql`${submissions.description} ILIKE ${searchPattern}`,
        sql`${submissions.modelName} ILIKE ${searchPattern}`
      )
    );
  }
  if (model) conditions.push(sql`${submissions.modelName} ILIKE ${`%${model}%`}`);
  if (gpu) conditions.push(sql`${submissions.gpu} ILIKE ${`%${gpu}%`}`);
  if (cpu) conditions.push(sql`${submissions.cpu} ILIKE ${`%${cpu}%`}`);
  if (quantization) conditions.push(eq(submissions.quantization, quantization));
  if (runtime) conditions.push(eq(submissions.runtime, runtime));
  if (minTps !== undefined) conditions.push(gte(submissions.tokensPerSecond, minTps));
  if (maxTps !== undefined) conditions.push(lte(submissions.tokensPerSecond, maxTps));

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

  const voterHash = await getVoterHash(c);
  type SanitizedSubmission = ReturnType<typeof sanitizeForResponse>;
  let dataWithVotes: Array<SanitizedSubmission & { userVote?: VoteValue | null }>;

  if (voterHash) {
    const userVotes = await Promise.all(
      results.map((r) => getUserVote(db, voterHash, r.id))
    );
    dataWithVotes = results.map((r, i) => ({
      ...sanitizeForResponse(r),
      userVote: userVotes[i],
    }));
  } else {
    dataWithVotes = results.map((r) => ({
      ...sanitizeForResponse(r),
    }));
  }

  return c.json({
    data: dataWithVotes,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

app.get("/meta", async (c) => {
  const db = getDb(c.env.DATABASE_URL);

  const [models, gpus, runtimes, quantizations] = await Promise.all([
    db
      .select({
        name: submissions.modelName,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(submissions)
      .groupBy(submissions.modelName)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({
        name: submissions.gpu,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(submissions)
      .where(sql`${submissions.gpu} IS NOT NULL`)
      .groupBy(submissions.gpu)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({
        name: submissions.runtime,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(submissions)
      .groupBy(submissions.runtime)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({
        name: submissions.quantization,
        count: sql<number>`count(*)`.as("count"),
      })
      .from(submissions)
      .where(sql`${submissions.quantization} IS NOT NULL`)
      .groupBy(submissions.quantization)
      .orderBy(desc(sql`count(*)`)),
  ]);

  return c.json({
    models: models.filter((m) => m.name).map((m) => ({ name: m.name, count: Number(m.count) })),
    gpus: gpus.filter((g) => g.name).map((g) => ({ name: g.name, count: Number(g.count) })),
    runtimes: runtimes.map((r) => ({ name: r.name, count: Number(r.count) })),
    quantizations: quantizations
      .filter((q) => q.name)
      .map((q) => ({ name: q.name, count: Number(q.count) })),
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

  const voterHash = await getVoterHash(c);
  let userVote: VoteValue | null = null;

  if (voterHash) {
    userVote = await getUserVote(db, voterHash, id);
  }

  return c.json({ data: { ...sanitizeForResponse(submission[0]), userVote } });
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
