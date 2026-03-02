import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc, sql as drizzleSql } from "drizzle-orm";
import {
  createTestDb,
  createMockEnv,
  submissions,
  comments,
  commentVotes,
  models,
} from "../test/db";
import {
  createCommentSchema,
  listCommentsQuerySchema,
  voteCommentSchema,
  type CommentNode,
} from "@sharellama/model/schemas/comment";
import { createTestModel, createTestSubmission } from "../test/fixtures";

type Env = ReturnType<typeof createMockEnv>;

function truncateHash(hash: string): string {
  return hash.slice(0, 4);
}

function buildCommentTree(commentsList: (typeof comments.$inferSelect)[]): CommentNode[] {
  const commentMap = new Map<number, CommentNode>();
  const rootComments: CommentNode[] = [];

  for (const comment of commentsList) {
    commentMap.set(comment.id, {
      id: comment.id,
      submissionId: comment.submissionId,
      authorHash: truncateHash(comment.authorHash),
      parentId: comment.parentId ?? null,
      body: comment.body,
      score: comment.score,
      createdAt: comment.createdAt.toISOString(),
      replies: [],
    });
  }

  for (const comment of commentsList) {
    const node = commentMap.get(comment.id)!;
    if (comment.parentId === null) {
      rootComments.push(node);
    } else {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        parent.replies!.push(node);
      }
    }
  }

  return rootComments;
}

function sanitizeComment(comment: typeof comments.$inferSelect): CommentNode {
  return {
    id: comment.id,
    submissionId: comment.submissionId,
    authorHash: truncateHash(comment.authorHash),
    parentId: comment.parentId ?? null,
    body: comment.body,
    score: comment.score,
    createdAt: comment.createdAt.toISOString(),
  };
}

async function hashFingerprint(fp: string): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fp));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function createCommentsApp() {
  const { db } = await createTestDb();

  const submissionRoutes = new Hono<{ Bindings: Env }>();
  const commentRoutes = new Hono<{ Bindings: Env }>();

  submissionRoutes.get("/:id/comments", zValidator("query", listCommentsQuerySchema), async (c) => {
    const submissionId = parseInt(c.req.param("id"), 10);

    if (isNaN(submissionId)) {
      return c.json({ error: "Invalid submission ID" }, 400);
    }

    const submission = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);

    if (!submission[0]) {
      return c.json({ error: "Submission not found" }, 404);
    }

    const query = c.req.valid("query");

    const commentsList = await db
      .select()
      .from(comments)
      .where(eq(comments.submissionId, submissionId))
      .orderBy(desc(comments.score), desc(comments.createdAt));

    if (query.include === "all") {
      const tree = buildCommentTree(commentsList);
      return c.json({ data: tree });
    }

    return c.json({ data: commentsList.map(sanitizeComment) });
  });

  submissionRoutes.post("/:id/comments", zValidator("json", createCommentSchema), async (c) => {
    const submissionId = parseInt(c.req.param("id"), 10);

    if (isNaN(submissionId)) {
      return c.json({ error: "Invalid submission ID" }, 400);
    }

    const submission = await db
      .select()
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);

    if (!submission[0]) {
      return c.json({ error: "Submission not found" }, 404);
    }

    const data = c.req.valid("json");
    const fingerprint = c.req.header("X-Fingerprint");

    if (!fingerprint) {
      return c.json({ error: "Fingerprint required" }, 400);
    }

    const authorHash = await hashFingerprint(fingerprint);

    if (data.parentId) {
      const parentComment = await db
        .select()
        .from(comments)
        .where(and(eq(comments.id, data.parentId), eq(comments.submissionId, submissionId)))
        .limit(1);

      if (!parentComment[0]) {
        return c.json({ error: "Parent comment not found" }, 404);
      }
    }

    const [comment] = await db
      .insert(comments)
      .values({
        submissionId,
        authorHash,
        parentId: data.parentId ?? null,
        body: data.body,
      })
      .returning();

    if (!comment) {
      return c.json({ error: "Failed to create comment" }, 500);
    }

    return c.json({ data: sanitizeComment(comment) }, 201);
  });

  commentRoutes.post("/:id/vote", zValidator("json", voteCommentSchema), async (c) => {
    const commentId = parseInt(c.req.param("id"), 10);

    if (isNaN(commentId)) {
      return c.json({ error: "Invalid comment ID" }, 400);
    }

    const fingerprint = c.req.header("X-Fingerprint");
    if (!fingerprint) {
      return c.json({ error: "Fingerprint required" }, 400);
    }

    const voterHash = await hashFingerprint(fingerprint);
    const data = c.req.valid("json");

    const comment = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);

    if (!comment[0]) {
      return c.json({ error: "Comment not found" }, 404);
    }

    const existingVote = await db
      .select()
      .from(commentVotes)
      .where(and(eq(commentVotes.voterHash, voterHash), eq(commentVotes.commentId, commentId)))
      .limit(1);

    if (existingVote[0]) {
      if (existingVote[0].value === data.value) {
        await db.delete(commentVotes).where(eq(commentVotes.id, existingVote[0].id));
        await db
          .update(comments)
          .set({ score: drizzleSql`${comments.score} - ${data.value}` })
          .where(eq(comments.id, commentId));
      } else {
        await db
          .update(commentVotes)
          .set({ value: data.value })
          .where(eq(commentVotes.id, existingVote[0].id));
        await db
          .update(comments)
          .set({ score: drizzleSql`${comments.score} + ${data.value * 2}` })
          .where(eq(comments.id, commentId));
      }
    } else {
      await db.insert(commentVotes).values({
        voterHash,
        commentId,
        value: data.value,
      });
      await db
        .update(comments)
        .set({ score: drizzleSql`${comments.score} + ${data.value}` })
        .where(eq(comments.id, commentId));
    }

    const [updatedComment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    return c.json({ data: sanitizeComment(updatedComment!) });
  });

  const app = new Hono<{ Bindings: Env }>();
  app.route("/submissions", submissionRoutes);
  app.route("/comments", commentRoutes);

  return { app, db };
}

describe("Comments API", () => {
  describe("POST /submissions/:id/comments", () => {
    it("creates a root comment", async () => {
      const { app, db } = await createCommentsApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      const [sub] = await db
        .insert(submissions)
        .values({
          ...createTestSubmission(),
          title: "Test",
          runtime: "r",
          authorHash: "a",
          editToken: "t",
        })
        .returning();

      const res = await app.request(
        `/submissions/${sub!.id}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "commenter-1",
          },
          body: JSON.stringify({ body: "Great post!" }),
        },
        env,
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as { data: CommentNode };
      expect(body.data.body).toBe("Great post!");
      expect(body.data.parentId).toBe(null);
      expect(body.data.authorHash).toHaveLength(4);
    });

    it("creates a threaded reply", async () => {
      const { app, db } = await createCommentsApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      const [sub] = await db
        .insert(submissions)
        .values({
          ...createTestSubmission(),
          title: "Test",
          runtime: "r",
          authorHash: "a",
          editToken: "t",
        })
        .returning();

      const authorHash = await hashFingerprint("commenter-1");
      const [parent] = await db
        .insert(comments)
        .values({ submissionId: sub!.id, authorHash, body: "Parent comment" })
        .returning();

      const res = await app.request(
        `/submissions/${sub!.id}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "commenter-2",
          },
          body: JSON.stringify({ body: "Reply!", parentId: parent!.id }),
        },
        env,
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as { data: CommentNode };
      expect(body.data.body).toBe("Reply!");
      expect(body.data.parentId).toBe(parent!.id);
    });

    it("requires fingerprint", async () => {
      const { app, db } = await createCommentsApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      const [sub] = await db
        .insert(submissions)
        .values({
          ...createTestSubmission(),
          title: "Test",
          runtime: "r",
          authorHash: "a",
          editToken: "t",
        })
        .returning();

      const res = await app.request(
        `/submissions/${sub!.id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: "Comment" }),
        },
        env,
      );

      expect(res.status).toBe(400);
    });

    it("validates body length", async () => {
      const { app, db } = await createCommentsApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      const [sub] = await db
        .insert(submissions)
        .values({
          ...createTestSubmission(),
          title: "Test",
          runtime: "r",
          authorHash: "a",
          editToken: "t",
        })
        .returning();

      const res = await app.request(
        `/submissions/${sub!.id}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "fp",
          },
          body: JSON.stringify({ body: "" }),
        },
        env,
      );

      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent submission", async () => {
      const { app } = await createCommentsApp();
      const env = createMockEnv();

      const res = await app.request(
        "/submissions/99999/comments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "fp",
          },
          body: JSON.stringify({ body: "Comment" }),
        },
        env,
      );

      expect(res.status).toBe(404);
    });

    it("returns 404 for non-existent parent comment", async () => {
      const { app, db } = await createCommentsApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      const [sub] = await db
        .insert(submissions)
        .values({
          ...createTestSubmission(),
          title: "Test",
          runtime: "r",
          authorHash: "a",
          editToken: "t",
        })
        .returning();

      const res = await app.request(
        `/submissions/${sub!.id}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "fp",
          },
          body: JSON.stringify({ body: "Reply", parentId: 99999 }),
        },
        env,
      );

      expect(res.status).toBe(404);
    });
  });

  describe("GET /submissions/:id/comments", () => {
    it("returns flat comments", async () => {
      const { app, db } = await createCommentsApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      const [sub] = await db
        .insert(submissions)
        .values({
          ...createTestSubmission(),
          title: "Test",
          runtime: "r",
          authorHash: "a",
          editToken: "t",
        })
        .returning();

      await db.insert(comments).values([
        { submissionId: sub!.id, authorHash: "a1", body: "Comment 1" },
        { submissionId: sub!.id, authorHash: "a2", body: "Comment 2" },
      ]);

      const res = await app.request(`/submissions/${sub!.id}/comments?include=flat`, {}, env);

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: CommentNode[] };
      expect(body.data.length).toBe(2);
    });

    it("returns threaded comments", async () => {
      const { app, db } = await createCommentsApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      const [sub] = await db
        .insert(submissions)
        .values({
          ...createTestSubmission(),
          title: "Test",
          runtime: "r",
          authorHash: "a",
          editToken: "t",
        })
        .returning();

      const [parent] = await db
        .insert(comments)
        .values({ submissionId: sub!.id, authorHash: "a1", body: "Parent" })
        .returning();

      await db.insert(comments).values([
        { submissionId: sub!.id, authorHash: "a2", body: "Reply 1", parentId: parent!.id },
        { submissionId: sub!.id, authorHash: "a3", body: "Reply 2", parentId: parent!.id },
      ]);

      const res = await app.request(`/submissions/${sub!.id}/comments?include=all`, {}, env);

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: CommentNode[] };
      expect(body.data.length).toBe(1);
      expect(body.data[0]!.replies!.length).toBe(2);
    });

    it("returns 404 for non-existent submission", async () => {
      const { app } = await createCommentsApp();
      const env = createMockEnv();

      const res = await app.request("/submissions/99999/comments", {}, env);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /comments/:id/vote", () => {
    it("upvotes a comment", async () => {
      const { app, db } = await createCommentsApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      const [sub] = await db
        .insert(submissions)
        .values({
          ...createTestSubmission(),
          title: "Test",
          runtime: "r",
          authorHash: "a",
          editToken: "t",
        })
        .returning();

      const [comment] = await db
        .insert(comments)
        .values({ submissionId: sub!.id, authorHash: "a1", body: "Comment", score: 0 })
        .returning();

      const res = await app.request(
        `/comments/${comment!.id}/vote`,
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
      const body = (await res.json()) as { data: CommentNode };
      expect(body.data.score).toBe(1);
    });

    it("toggles vote off", async () => {
      const { app, db } = await createCommentsApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      const [sub] = await db
        .insert(submissions)
        .values({
          ...createTestSubmission(),
          title: "Test",
          runtime: "r",
          authorHash: "a",
          editToken: "t",
        })
        .returning();

      const [comment] = await db
        .insert(comments)
        .values({ submissionId: sub!.id, authorHash: "a1", body: "Comment", score: 0 })
        .returning();

      await app.request(
        `/comments/${comment!.id}/vote`,
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
        `/comments/${comment!.id}/vote`,
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
      const body = (await res.json()) as { data: CommentNode };
      expect(body.data.score).toBe(0);
    });

    it("changes vote from up to down", async () => {
      const { app, db } = await createCommentsApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      const [sub] = await db
        .insert(submissions)
        .values({
          ...createTestSubmission(),
          title: "Test",
          runtime: "r",
          authorHash: "a",
          editToken: "t",
        })
        .returning();

      const [comment] = await db
        .insert(comments)
        .values({ submissionId: sub!.id, authorHash: "a1", body: "Comment", score: 0 })
        .returning();

      await app.request(
        `/comments/${comment!.id}/vote`,
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
        `/comments/${comment!.id}/vote`,
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
      const body = (await res.json()) as { data: CommentNode };
      expect(body.data.score).toBe(-1);
    });

    it("requires fingerprint", async () => {
      const { app } = await createCommentsApp();
      const env = createMockEnv();

      const res = await app.request(
        "/comments/1/vote",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: 1 }),
        },
        env,
      );

      expect(res.status).toBe(400);
    });

    it("returns 404 for non-existent comment", async () => {
      const { app } = await createCommentsApp();
      const env = createMockEnv();

      const res = await app.request(
        "/comments/99999/vote",
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
  });
});
