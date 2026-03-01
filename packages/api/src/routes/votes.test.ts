import { describe, it, expect, beforeEach } from "vitest";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, sql as drizzleSql } from "drizzle-orm";
import { createTestDb, createMockEnv, submissions, votes } from "../test/db";
import { createVoteSchema } from "@sharellama/model/schemas/vote";

type Env = ReturnType<typeof createMockEnv>;

async function createVotesApp() {
  const { db } = await createTestDb();

  async function hashFingerprint(fingerprint: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  const app = new Hono<{ Bindings: Env }>();

  app.post("/:id/vote", zValidator("json", createVoteSchema), async (c) => {
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
            score: drizzleSql`${submissions.score} - ${value}`,
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
          score: drizzleSql`${submissions.score} + ${voteDiff}`,
          updatedAt: new Date(),
        })
        .where(eq(submissions.id, submissionId))
        .returning();

      return c.json({
        score: updatedSubmission?.score ?? 0,
        userVote: updatedVote?.value,
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
        score: drizzleSql`${submissions.score} + ${value}`,
        updatedAt: new Date(),
      })
      .where(eq(submissions.id, submissionId))
      .returning();

    return c.json({ score: updated?.score ?? 0, userVote: value });
  });

  app.get("/:id/vote", async (c) => {
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

    return c.json({ value: vote[0]?.value ?? null });
  });

  return { app, db };
}

async function getHash(fp: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fp));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("Votes API", () => {
  describe("POST /:id/vote", () => {
    it("creates an upvote", async () => {
      const { app, db } = await createVotesApp();
      const env = createMockEnv();

      const [sub] = await db
        .insert(submissions)
        .values({
          title: "Test",
          runtime: "r",
          modelName: "m",
          authorHash: "a",
          editToken: "t",
          score: 0,
          updatedAt: new Date(),
        })
        .returning();

      const res = await app.request(
        `/${sub.id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "voter-1",
          },
          body: JSON.stringify({ value: 1 }),
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.score).toBe(1);
      expect(body.userVote).toBe(1);
    });

    it("creates a downvote", async () => {
      const { app, db } = await createVotesApp();
      const env = createMockEnv();

      const [sub] = await db
        .insert(submissions)
        .values({
          title: "Test",
          runtime: "r",
          modelName: "m",
          authorHash: "a",
          editToken: "t",
          score: 5,
          updatedAt: new Date(),
        })
        .returning();

      const res = await app.request(
        `/${sub.id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "voter-1",
          },
          body: JSON.stringify({ value: -1 }),
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.score).toBe(4);
      expect(body.userVote).toBe(-1);
    });

    it("toggles vote off when voting same value", async () => {
      const { app, db } = await createVotesApp();
      const env = createMockEnv();

      const [sub] = await db
        .insert(submissions)
        .values({
          title: "Test",
          runtime: "r",
          modelName: "m",
          authorHash: "a",
          editToken: "t",
          score: 0,
          updatedAt: new Date(),
        })
        .returning();

      await app.request(
        `/${sub.id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "voter-1",
          },
          body: JSON.stringify({ value: 1 }),
        },
        env,
      );

      const res = await app.request(
        `/${sub.id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "voter-1",
          },
          body: JSON.stringify({ value: 1 }),
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.score).toBe(0);
      expect(body.userVote).toBe(null);

      const voteRecords = await db.select().from(votes);
      expect(voteRecords.length).toBe(0);
    });

    it("changes vote from up to down", async () => {
      const { app, db } = await createVotesApp();
      const env = createMockEnv();

      const [sub] = await db
        .insert(submissions)
        .values({
          title: "Test",
          runtime: "r",
          modelName: "m",
          authorHash: "a",
          editToken: "t",
          score: 0,
          updatedAt: new Date(),
        })
        .returning();

      await app.request(
        `/${sub.id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "voter-1",
          },
          body: JSON.stringify({ value: 1 }),
        },
        env,
      );

      const res = await app.request(
        `/${sub.id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "voter-1",
          },
          body: JSON.stringify({ value: -1 }),
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.score).toBe(-1);
      expect(body.userVote).toBe(-1);
    });

    it("requires fingerprint", async () => {
      const { app, db } = await createVotesApp();
      const env = createMockEnv();

      const [sub] = await db
        .insert(submissions)
        .values({
          title: "Test",
          runtime: "r",
          modelName: "m",
          authorHash: "a",
          editToken: "t",
          updatedAt: new Date(),
        })
        .returning();

      const res = await app.request(
        `/${sub.id}/vote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: 1 }),
        },
        env,
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("Fingerprint required");
    });

    it("returns 404 for non-existent submission", async () => {
      const { app } = await createVotesApp();
      const env = createMockEnv();

      const res = await app.request(
        "/99999/vote",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "voter-1",
          },
          body: JSON.stringify({ value: 1 }),
        },
        env,
      );

      expect(res.status).toBe(404);
    });

    it("allows different users to vote independently", async () => {
      const { app, db } = await createVotesApp();
      const env = createMockEnv();

      const [sub] = await db
        .insert(submissions)
        .values({
          title: "Test",
          runtime: "r",
          modelName: "m",
          authorHash: "a",
          editToken: "t",
          score: 0,
          updatedAt: new Date(),
        })
        .returning();

      await app.request(
        `/${sub.id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "voter-1",
          },
          body: JSON.stringify({ value: 1 }),
        },
        env,
      );

      const res = await app.request(
        `/${sub.id}/vote`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "voter-2",
          },
          body: JSON.stringify({ value: 1 }),
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.score).toBe(2);

      const voteRecords = await db.select().from(votes);
      expect(voteRecords.length).toBe(2);
    });
  });

  describe("GET /:id/vote", () => {
    it("returns user vote", async () => {
      const { app, db } = await createVotesApp();
      const env = createMockEnv();

      const [sub] = await db
        .insert(submissions)
        .values({
          title: "Test",
          runtime: "r",
          modelName: "m",
          authorHash: "a",
          editToken: "t",
          updatedAt: new Date(),
        })
        .returning();

      const voterHash = await getHash("voter-1");
      await db.insert(votes).values({ voterHash, submissionId: sub.id, value: 1 });

      const res = await app.request(
        `/${sub.id}/vote`,
        {
          headers: { "X-Fingerprint": "voter-1" },
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.value).toBe(1);
    });

    it("returns null when no vote", async () => {
      const { app, db } = await createVotesApp();
      const env = createMockEnv();

      const [sub] = await db
        .insert(submissions)
        .values({
          title: "Test",
          runtime: "r",
          modelName: "m",
          authorHash: "a",
          editToken: "t",
          updatedAt: new Date(),
        })
        .returning();

      const res = await app.request(
        `/${sub.id}/vote`,
        {
          headers: { "X-Fingerprint": "voter-1" },
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.value).toBe(null);
    });

    it("returns null without fingerprint", async () => {
      const { app } = await createVotesApp();
      const env = createMockEnv();

      const res = await app.request("/1/vote", {}, env);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.value).toBe(null);
    });
  });
});
