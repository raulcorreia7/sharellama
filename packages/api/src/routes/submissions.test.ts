import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc, asc, sql as drizzleSql } from "drizzle-orm";
import { createTestDb, createMockEnv, submissions, votes, models } from "../test/db";
import {
  createSubmissionSchema,
  updateSubmissionSchema,
  listSubmissionsQuerySchema,
} from "@sharellama/model/schemas/submission";
import { FIRST_MODEL, SECOND_MODEL, createTestSubmission, createTestModel } from "../test/fixtures";

type Env = ReturnType<typeof createMockEnv>;

async function createTestApp() {
  const { db } = await createTestDb();

  async function hashFingerprint(fingerprint: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(fingerprint);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async function generateToken(length: number): Promise<string> {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, length);
  }

  async function getVoterHash(c: {
    req: { header: (n: string) => string | undefined };
  }): Promise<string | null> {
    const fingerprint = c.req.header("X-Fingerprint");
    if (!fingerprint) return null;
    return hashFingerprint(fingerprint);
  }

  async function getOrCreateModel(slug: string): Promise<void> {
    const existing = await db.select().from(models).where(eq(models.slug, slug)).limit(1);
    if (existing[0]) return;

    const [org, ...nameParts] = slug.split("/");
    const name = nameParts.join("/");

    await db.insert(models).values({
      slug,
      name,
      org: org || null,
      configCount: 0,
    });
  }

  const app = new Hono<{ Bindings: Env }>();

  app.post("/", zValidator("json", createSubmissionSchema), async (c) => {
    const data = c.req.valid("json");
    const fingerprint = c.req.header("X-Fingerprint");

    if (!fingerprint) {
      return c.json({ error: "Fingerprint required" }, 400);
    }

    const authorHash = await hashFingerprint(fingerprint);
    const editToken = await generateToken(32);

    await getOrCreateModel(data.modelSlug);

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

    await db
      .update(models)
      .set({ configCount: drizzleSql`${models.configCount} + 1` })
      .where(eq(models.slug, data.modelSlug));

    const { editToken: _, ...response } = submission;
    const baseUrl = c.env.BASE_URL ?? new URL(c.req.url).origin;
    const adminLink = `${baseUrl}/submissions/${submission.id}/admin/${editToken}`;

    return c.json({ submission: response, adminLink }, 201);
  });

  app.get("/", zValidator("query", listSubmissionsQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const { page, limit, sort, order } = query;
    const offset = (page - 1) * limit;

    const sortColumn = {
      score: submissions.score,
      createdAt: submissions.createdAt,
      tokensPerSecond: submissions.tokensPerSecond,
    }[sort];

    const orderByFn = order === "asc" ? asc : desc;

    const results = await db
      .select()
      .from(submissions)
      .orderBy(orderByFn(sortColumn))
      .limit(limit)
      .offset(offset);

    const countResult = await db.select({ count: drizzleSql<number>`count(*)` }).from(submissions);

    const total = Number(countResult[0]?.count ?? 0);

    const voterHash = await getVoterHash(c);
    const dataWithVotes = await Promise.all(
      results.map(async (r) => {
        let userVote: number | null = null;
        if (voterHash) {
          const vote = await db
            .select()
            .from(votes)
            .where(and(eq(votes.voterHash, voterHash), eq(votes.submissionId, r.id)))
            .limit(1);
          userVote = vote[0]?.value ?? null;
        }
        const { editToken: _, ...rest } = r;
        return { ...rest, userVote };
      }),
    );

    return c.json({
      data: dataWithVotes,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  app.get("/:id", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    if (isNaN(id)) {
      return c.json({ error: "Invalid ID" }, 400);
    }

    const result = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);

    if (!result[0]) {
      return c.json({ error: "Submission not found" }, 404);
    }

    const voterHash = await getVoterHash(c);
    let userVote: number | null = null;
    if (voterHash) {
      const vote = await db
        .select()
        .from(votes)
        .where(and(eq(votes.voterHash, voterHash), eq(votes.submissionId, id)))
        .limit(1);
      userVote = vote[0]?.value ?? null;
    }

    const { editToken: _, ...response } = result[0];
    return c.json({ data: { ...response, userVote } });
  });

  app.patch("/:id/admin/:token", zValidator("json", updateSubmissionSchema), async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    const token = c.req.param("token");

    if (isNaN(id)) {
      return c.json({ error: "Invalid ID" }, 400);
    }

    const existing = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);

    if (!existing[0]) {
      return c.json({ error: "Submission not found" }, 404);
    }

    if (existing[0].editToken !== token) {
      return c.json({ error: "Invalid admin token" }, 403);
    }

    const data = c.req.valid("json");
    const [updated] = await db
      .update(submissions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(submissions.id, id))
      .returning();

    if (!updated) {
      return c.json({ error: "Failed to update submission" }, 500);
    }

    const { editToken: _, ...response } = updated;
    return c.json({ data: response });
  });

  app.delete("/:id/admin/:token", async (c) => {
    const id = parseInt(c.req.param("id"), 10);
    const token = c.req.param("token");

    if (isNaN(id)) {
      return c.json({ error: "Invalid ID" }, 400);
    }

    const existing = await db.select().from(submissions).where(eq(submissions.id, id)).limit(1);

    if (!existing[0]) {
      return c.json({ error: "Submission not found" }, 404);
    }

    if (existing[0].editToken !== token) {
      return c.json({ error: "Invalid admin token" }, 403);
    }

    await db.delete(submissions).where(eq(submissions.id, id));
    return c.body(null, 204);
  });

  return { app, db };
}

interface SubmissionResponse {
  submission: {
    id: number;
    title: string;
    runtime: string;
    modelSlug: string;
    editToken?: string;
  };
  adminLink: string;
}

interface ListResponse {
  data: Array<{
    id: number;
    title: string;
    modelSlug: string;
    score: number;
    userVote?: number | null;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

describe("Submissions API", () => {
  describe("POST /submissions", () => {
    it("creates a submission with valid data", async () => {
      const { app } = await createTestApp();
      const env = createMockEnv();

      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "test-fingerprint-123",
          },
          body: JSON.stringify({
            ...createTestSubmission(),
            title: "Test Submission",
            description: "A test description",
          }),
        },
        env,
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as SubmissionResponse;
      expect(body.submission.title).toBe("Test Submission");
      expect(body.submission.runtime).toBe("llama.cpp");
      expect(body.submission.modelSlug).toBe(FIRST_MODEL.slug);
      expect(body.adminLink).toContain("/admin/");
      expect(body.submission.editToken).toBeUndefined();
    });

    it("requires fingerprint header", async () => {
      const { app } = await createTestApp();
      const env = createMockEnv();

      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Test",
            runtime: "llama.cpp",
            modelSlug: FIRST_MODEL.slug,
          }),
        },
        env,
      );

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Fingerprint required");
    });

    it("validates required fields", async () => {
      const { app } = await createTestApp();
      const env = createMockEnv();

      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "test-fp",
          },
          body: JSON.stringify({
            title: "Test",
          }),
        },
        env,
      );

      expect(res.status).toBe(400);
    });

    it("creates submission with optional fields", async () => {
      const { app } = await createTestApp();
      const env = createMockEnv();

      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "test-fp",
          },
          body: JSON.stringify({
            ...createTestSubmission({
              runtimeVersion: "b3000",
              quantization: "Q4_K_M",
              gpu: "RTX 4090",
              cpu: "Ryzen 9 7950X",
              ramGb: 64,
              tokensPerSecond: 45.5,
            }),
            title: "Full Submission",
            description: "Description",
            tags: ["fast", "gpu"],
          }),
        },
        env,
      );

      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        submission: {
          gpu: string;
          cpu: string;
          ramGb: number;
          tokensPerSecond: number;
          tags: string[];
        };
      };
      expect(body.submission.gpu).toBe("RTX 4090");
      expect(body.submission.cpu).toBe("Ryzen 9 7950X");
      expect(body.submission.ramGb).toBe(64);
      expect(body.submission.tokensPerSecond).toBe(45.5);
      expect(body.submission.tags).toEqual(["fast", "gpu"]);
    });

    it("auto-creates model if it does not exist", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      const res = await app.request(
        "/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "test-fp",
          },
          body: JSON.stringify({
            title: "Test Submission",
            runtime: "llama.cpp",
            modelSlug: SECOND_MODEL.slug,
          }),
        },
        env,
      );

      expect(res.status).toBe(201);

      const modelResult = await db
        .select()
        .from(models)
        .where(eq(models.slug, SECOND_MODEL.slug))
        .limit(1);
      expect(modelResult[0]).toBeDefined();
      expect(modelResult[0]!.configCount).toBe(1);
    });
  });

  describe("GET /submissions", () => {
    it("returns paginated submissions", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db
        .insert(models)
        .values([
          createTestModel({ slug: FIRST_MODEL.slug }),
          createTestModel({ slug: SECOND_MODEL.slug }),
        ]);

      await db.insert(submissions).values([
        {
          ...createTestSubmission({ modelSlug: FIRST_MODEL.slug }),
          title: "Sub 1",
          authorHash: "a1",
          editToken: "t1",
        },
        {
          ...createTestSubmission({ modelSlug: SECOND_MODEL.slug }),
          title: "Sub 2",
          authorHash: "a2",
          editToken: "t2",
        },
      ]);

      const res = await app.request("/?page=1&limit=10", {}, env);
      expect(res.status).toBe(200);

      const body = (await res.json()) as ListResponse;
      expect(body.data.length).toBe(2);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(10);
      expect(body.pagination.total).toBe(2);
    });

    it("sorts by score descending by default for createdAt", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      await db.insert(submissions).values([
        {
          ...createTestSubmission(),
          title: "Older",
          runtime: "r",
          authorHash: "a",
          editToken: "t1",
          score: 10,
          updatedAt: new Date(Date.now() - 1000),
        },
        {
          ...createTestSubmission(),
          title: "Newer",
          runtime: "r",
          authorHash: "a",
          editToken: "t2",
          score: 5,
          updatedAt: new Date(),
        },
      ]);

      const res = await app.request("/?sort=score&order=desc", {}, env);
      const body = (await res.json()) as ListResponse;
      expect(body.data[0]!.score).toBe(10);
    });

    it("includes userVote when fingerprint provided", async () => {
      const { app, db } = await createTestApp();
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

      const voterHash = Array.from(
        new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("my-fp"))),
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      await db.insert(votes).values({
        voterHash,
        submissionId: sub!.id,
        value: 1,
      });

      const res = await app.request(
        "/",
        {
          headers: { "X-Fingerprint": "my-fp" },
        },
        env,
      );

      const body = (await res.json()) as ListResponse;
      expect(body.data[0]!.userVote).toBe(1);
    });
  });

  describe("GET /submissions/:id", () => {
    it("returns a single submission", async () => {
      const { app, db } = await createTestApp();
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

      const res = await app.request(`/${sub!.id}`, {}, env);
      expect(res.status).toBe(200);

      const body = (await res.json()) as { data: { id: number; title: string } };
      expect(body.data.id).toBe(sub!.id);
      expect(body.data.title).toBe("Test");
    });

    it("returns 404 for non-existent submission", async () => {
      const { app } = await createTestApp();
      const env = createMockEnv();

      const res = await app.request("/99999", {}, env);
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid ID", async () => {
      const { app } = await createTestApp();
      const env = createMockEnv();

      const res = await app.request("/invalid", {}, env);
      expect(res.status).toBe(400);
    });
  });

  describe("PATCH /submissions/:id/admin/:token", () => {
    it("updates submission with valid token", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      const [sub] = await db
        .insert(submissions)
        .values({
          ...createTestSubmission(),
          title: "Original",
          runtime: "r",
          authorHash: "a",
          editToken: "valid-token",
        })
        .returning();

      const res = await app.request(
        `/${sub!.id}/admin/valid-token`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Updated" }),
        },
        env,
      );

      expect(res.status).toBe(200);
      const body = (await res.json()) as { data: { title: string } };
      expect(body.data.title).toBe("Updated");
    });

    it("rejects invalid token", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      const [sub] = await db
        .insert(submissions)
        .values({
          ...createTestSubmission(),
          title: "Test",
          runtime: "r",
          authorHash: "a",
          editToken: "correct-token",
        })
        .returning();

      const res = await app.request(
        `/${sub!.id}/admin/wrong-token`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Hacked" }),
        },
        env,
      );

      expect(res.status).toBe(403);
    });

    it("returns 404 for non-existent submission", async () => {
      const { app } = await createTestApp();
      const env = createMockEnv();

      const res = await app.request(
        "/99999/admin/token",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Updated" }),
        },
        env,
      );

      expect(res.status).toBe(404);
    });
  });

  describe("DELETE /submissions/:id/admin/:token", () => {
    it("deletes submission with valid token", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      const [sub] = await db
        .insert(submissions)
        .values({
          ...createTestSubmission(),
          title: "To Delete",
          runtime: "r",
          authorHash: "a",
          editToken: "delete-token",
        })
        .returning();

      const res = await app.request(
        `/${sub!.id}/admin/delete-token`,
        {
          method: "DELETE",
        },
        env,
      );

      expect(res.status).toBe(204);

      const remaining = await db.select().from(submissions).where(eq(submissions.id, sub!.id));
      expect(remaining.length).toBe(0);
    });

    it("rejects invalid token", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db.insert(models).values(createTestModel());

      const [sub] = await db
        .insert(submissions)
        .values({
          ...createTestSubmission(),
          title: "Test",
          runtime: "r",
          authorHash: "a",
          editToken: "correct",
        })
        .returning();

      const res = await app.request(
        `/${sub!.id}/admin/wrong`,
        {
          method: "DELETE",
        },
        env,
      );

      expect(res.status).toBe(403);

      const remaining = await db.select().from(submissions);
      expect(remaining.length).toBe(1);
    });
  });
});
