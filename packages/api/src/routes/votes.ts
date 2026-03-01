import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, sql } from "drizzle-orm";
import type { Env } from "../env";
import { getDb } from "../lib/db";
import { submissions, votes } from "@sharellama/database";
import { createVoteSchema, type VoteValue } from "@sharellama/model/schemas/vote";
import { rateLimitVote } from "../middleware/rateLimit";

const app = new Hono<{ Bindings: Env }>();

async function hashFingerprint(fingerprint: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

app.post("/:id/vote", rateLimitVote, zValidator("json", createVoteSchema), async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const submissionId = parseInt(c.req.param("id"), 10);
  const { value } = c.req.valid("json");

  if (isNaN(submissionId)) {
    return c.json({ error: "Invalid submission ID" }, 400);
  }

  const fingerprint = c.req.header("X-Fingerprint");
  if (!fingerprint) {
    return c.json({ error: "Fingerprint required" }, 400);
  }

  const voterHash = await hashFingerprint(fingerprint);

  const submission = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, submissionId))
    .limit(1);

  if (!submission[0]) {
    return c.json({ error: "Submission not found" }, 404);
  }

  const existingVote = await db
    .select()
    .from(votes)
    .where(and(eq(votes.voterHash, voterHash), eq(votes.submissionId, submissionId)))
    .limit(1);

  if (existingVote[0]) {
    if (existingVote[0].value === value) {
      await db.delete(votes).where(eq(votes.id, existingVote[0].id));

      const [updated] = await db
        .update(submissions)
        .set({
          score: sql`${submissions.score} - ${value}`,
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, submissionId))
        .returning();

      return c.json({ score: updated?.score ?? 0, userVote: null });
    }

    const voteDiff = value - existingVote[0].value;

    const [updatedVote] = await db
      .update(votes)
      .set({ value })
      .where(eq(votes.id, existingVote[0].id))
      .returning();

    const [updatedSubmission] = await db
      .update(submissions)
      .set({
        score: sql`${submissions.score} + ${voteDiff}`,
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, submissionId))
      .returning();

    return c.json({
      score: updatedSubmission?.score ?? 0,
      userVote: updatedVote?.value as VoteValue,
    });
  }

  await db.insert(votes).values({
    voterHash,
    submissionId,
    value,
  });

  const [updated] = await db
    .update(submissions)
    .set({
      score: sql`${submissions.score} + ${value}`,
      updatedAt: new Date(),
    })
    .where(eq(submissions.id, submissionId))
    .returning();

  return c.json({ score: updated?.score ?? 0, userVote: value });
});

app.get("/:id/vote", async (c) => {
  const db = getDb(c.env.DATABASE_URL);
  const submissionId = parseInt(c.req.param("id"), 10);

  if (isNaN(submissionId)) {
    return c.json({ error: "Invalid submission ID" }, 400);
  }

  const fingerprint = c.req.header("X-Fingerprint");
  if (!fingerprint) {
    return c.json({ value: null });
  }

  const voterHash = await hashFingerprint(fingerprint);

  const vote = await db
    .select()
    .from(votes)
    .where(and(eq(votes.voterHash, voterHash), eq(votes.submissionId, submissionId)))
    .limit(1);

  return c.json({ value: (vote[0]?.value as VoteValue) ?? null });
});

export default app;
