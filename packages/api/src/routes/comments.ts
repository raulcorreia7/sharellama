import { zValidator } from "@hono/zod-validator";

import { atomicIncrement, comments, commentVotes, submissions } from "@sharellama/database";
import {
  type CommentNode,
  createCommentSchema,
  listCommentsQuerySchema,
  voteCommentSchema,
} from "@sharellama/model/schemas/comment";

import type { Env } from "../env";
import { getConfig } from "../env";
import { getDb } from "../lib/db";
import { rateLimitComment, rateLimitVote } from "../middleware/rateLimit";
import { verifyTurnstile } from "../middleware/turnstile";

import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";

async function hashFingerprint(fingerprint: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function truncateAuthorHash(hash: string): string {
  return hash.slice(0, 4);
}

export function buildCommentTree(commentsList: (typeof comments.$inferSelect)[]): CommentNode[] {
  const commentMap = new Map<number, CommentNode>();
  const rootComments: CommentNode[] = [];

  for (const comment of commentsList) {
    commentMap.set(comment.id, {
      id: comment.id,
      submissionId: comment.submissionId,
      authorHash: truncateAuthorHash(comment.authorHash),
      parentId: comment.parentId,
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

export function sanitizeCommentForResponse(comment: typeof comments.$inferSelect): CommentNode {
  return {
    id: comment.id,
    submissionId: comment.submissionId,
    authorHash: truncateAuthorHash(comment.authorHash),
    parentId: comment.parentId,
    body: comment.body,
    score: comment.score,
    createdAt: comment.createdAt.toISOString(),
  };
}

const submissionCommentsRoutes = new Hono<{ Bindings: Env }>();

submissionCommentsRoutes.get(
  "/:id/comments",
  zValidator("query", listCommentsQuerySchema),
  async (c) => {
    const db = getDb(getConfig(c.env).db.url);
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

    return c.json({
      data: commentsList.map(sanitizeCommentForResponse),
    });
  },
);

submissionCommentsRoutes.post(
  "/:id/comments",
  rateLimitComment,
  verifyTurnstile(),
  zValidator("json", createCommentSchema),
  async (c) => {
    const db = getDb(getConfig(c.env).db.url);
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

    return c.json({ data: sanitizeCommentForResponse(comment) }, 201);
  },
);

const commentsRoutes = new Hono<{ Bindings: Env }>();

commentsRoutes.post(
  "/:id/vote",
  rateLimitVote,
  zValidator("json", voteCommentSchema),
  async (c) => {
    const db = getDb(getConfig(c.env).db.url);
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
          .set({ score: atomicIncrement(comments.score, -data.value) })
          .where(eq(comments.id, commentId));
      } else {
        await db
          .update(commentVotes)
          .set({ value: data.value })
          .where(eq(commentVotes.id, existingVote[0].id));
        await db
          .update(comments)
          .set({ score: atomicIncrement(comments.score, data.value * 2) })
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
        .set({ score: atomicIncrement(comments.score, data.value) })
        .where(eq(comments.id, commentId));
    }

    const updatedComment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    return c.json({ data: sanitizeCommentForResponse(updatedComment[0]!) });
  },
);

commentsRoutes.delete("/:id", async (c) => {
  const db = getDb(getConfig(c.env).db.url);
  const commentId = parseInt(c.req.param("id"), 10);

  if (isNaN(commentId)) {
    return c.json({ error: "Invalid comment ID" }, 400);
  }

  const fingerprint = c.req.header("X-Fingerprint");
  if (!fingerprint) {
    return c.json({ error: "Fingerprint required" }, 400);
  }

  const authorHash = await hashFingerprint(fingerprint);

  const comment = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);

  if (!comment[0]) {
    return c.json({ error: "Comment not found" }, 404);
  }

  if (comment[0].authorHash !== authorHash) {
    return c.json({ error: "Not authorized to delete this comment" }, 403);
  }

  const [updated] = await db
    .update(comments)
    .set({ body: "[deleted]" })
    .where(eq(comments.id, commentId))
    .returning();

  if (!updated) {
    return c.json({ error: "Failed to delete comment" }, 500);
  }

  return c.json({ data: sanitizeCommentForResponse(updated) });
});

export { commentsRoutes, submissionCommentsRoutes };
