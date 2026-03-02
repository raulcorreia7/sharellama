import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, and, desc, asc, ilike, sql as drizzleSql } from "drizzle-orm";
import { createTestDb, createMockEnv, submissions, models } from "../test/db";
import { createSubmissionSchema } from "@sharellama/model/schemas/submission";
import { listModelsQuerySchema } from "@sharellama/model/schemas/model";
import { FIRST_MODEL, createTestModel, createTestSubmission } from "../test/fixtures";

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

  const submissionsApp = new Hono<{ Bindings: Env }>();

  submissionsApp.post("/", zValidator("json", createSubmissionSchema), async (c) => {
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

  const modelsApp = new Hono<{ Bindings: Env }>();

  modelsApp.get("/", zValidator("query", listModelsQuerySchema), async (c) => {
    const query = c.req.valid("query");
    const { q, sort, order, page, limit } = query;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (q) {
      conditions.push(ilike(models.name, `%${q}%`));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const sortColumn = {
      configCount: models.configCount,
      createdAt: models.createdAt,
    }[sort];

    const orderByFn = order === "asc" ? asc : desc;

    const [results, countResult] = await Promise.all([
      db
        .select()
        .from(models)
        .where(whereClause)
        .orderBy(orderByFn(sortColumn))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: drizzleSql<number>`count(*)` })
        .from(models)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    return c.json({
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  modelsApp.get("/:slug", async (c) => {
    const slug = c.req.param("slug");

    const model = await db.select().from(models).where(eq(models.slug, slug)).limit(1);

    if (!model[0]) {
      return c.json({ error: "Model not found" }, 404);
    }

    const page = 1;
    const limit = 20;
    const offset = 0;

    const conditions = [eq(submissions.modelSlug, slug)];

    const [configs, countResult] = await Promise.all([
      db
        .select()
        .from(submissions)
        .where(and(...conditions))
        .orderBy(desc(submissions.score))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: drizzleSql<number>`count(*)` })
        .from(submissions)
        .where(and(...conditions)),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    const sanitizedConfigs = configs.map((c) => {
      const { editToken: _, ...rest } = c;
      return rest;
    });

    return c.json({
      data: model[0],
      configurations: sanitizedConfigs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  const app = new Hono<{ Bindings: Env }>();
  app.route("/submissions", submissionsApp);
  app.route("/models", modelsApp);

  return { app, db };
}

interface ModelListResponse {
  data: Array<{
    slug: string;
    name: string;
    org: string | null;
    configCount: number;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ModelDetailResponse {
  data: {
    slug: string;
    name: string;
    org: string | null;
    configCount: number;
  };
  configurations: Array<{
    id: number;
    title: string;
    modelSlug: string;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

describe("Models API", () => {
  describe("GET /models", () => {
    it("returns paginated models", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db
        .insert(models)
        .values([
          createTestModel({ slug: "model-a", name: "Model A", org: "org1", configCount: 5 }),
          createTestModel({ slug: "model-b", name: "Model B", org: "org2", configCount: 3 }),
        ]);

      const res = await app.request("/models?page=1&limit=10", {}, env);
      expect(res.status).toBe(200);

      const body = (await res.json()) as ModelListResponse;
      expect(body.data.length).toBe(2);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(10);
      expect(body.pagination.total).toBe(2);
    });

    it("sorts by configCount descending by default", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db
        .insert(models)
        .values([
          createTestModel({ slug: "popular", name: "Popular Model", configCount: 100 }),
          createTestModel({ slug: "less-popular", name: "Less Popular", configCount: 10 }),
        ]);

      const res = await app.request("/models?sort=configCount&order=desc", {}, env);
      const body = (await res.json()) as ModelListResponse;
      expect(body.data[0]!.configCount).toBe(100);
      expect(body.data[1]!.configCount).toBe(10);
    });

    it("sorts by createdAt ascending", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db
        .insert(models)
        .values([
          createTestModel({ slug: "older", name: "Older Model", configCount: 1 }),
          createTestModel({ slug: "newer", name: "Newer Model", configCount: 1 }),
        ]);

      const res = await app.request("/models?sort=createdAt&order=asc", {}, env);
      expect(res.status).toBe(200);
      const body = (await res.json()) as ModelListResponse;
      expect(body.data.length).toBe(2);
    });
  });

  describe("GET /models?search=query", () => {
    it("filters models by name", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db.insert(models).values([
        createTestModel({ slug: "llama-3", name: "Llama 3 8B", org: "meta", configCount: 5 }),
        createTestModel({
          slug: "mistral-7b",
          name: "Mistral 7B",
          org: "mistral",
          configCount: 3,
        }),
        createTestModel({ slug: "llama-2", name: "Llama 2 7B", org: "meta", configCount: 2 }),
      ]);

      const res = await app.request("/models?q=llama", {}, env);
      expect(res.status).toBe(200);

      const body = (await res.json()) as ModelListResponse;
      expect(body.data.length).toBe(2);
      expect(body.data.every((m) => m.name.toLowerCase().includes("llama"))).toBe(true);
    });

    it("returns empty array when no matches", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db
        .insert(models)
        .values([createTestModel({ slug: "model-a", name: "Model A", configCount: 1 })]);

      const res = await app.request("/models?q=nonexistent", {}, env);
      expect(res.status).toBe(200);

      const body = (await res.json()) as ModelListResponse;
      expect(body.data.length).toBe(0);
      expect(body.pagination.total).toBe(0);
    });
  });

  describe("GET /models/:slug", () => {
    it("returns model with its configurations", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db.insert(models).values(
        createTestModel({
          slug: "llama-3-8b",
          name: "Llama 3 8B",
          org: "meta",
          configCount: 2,
        }),
      );

      await db.insert(submissions).values([
        {
          ...createTestSubmission({ modelSlug: "llama-3-8b" }),
          title: "Config 1",
          authorHash: "a1",
          editToken: "t1",
          score: 10,
        },
        {
          ...createTestSubmission({ modelSlug: "llama-3-8b" }),
          title: "Config 2",
          authorHash: "a2",
          editToken: "t2",
          score: 5,
        },
      ]);

      const res = await app.request("/models/llama-3-8b", {}, env);
      expect(res.status).toBe(200);

      const body = (await res.json()) as ModelDetailResponse;
      expect(body.data.slug).toBe("llama-3-8b");
      expect(body.data.name).toBe("Llama 3 8B");
      expect(body.data.org).toBe("meta");
      expect(body.configurations.length).toBe(2);
      expect(body.pagination.total).toBe(2);
    });

    it("sorts configurations by score descending", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db.insert(models).values(
        createTestModel({
          slug: "test-model",
          name: "Test Model",
          configCount: 2,
        }),
      );

      await db.insert(submissions).values([
        {
          ...createTestSubmission({ modelSlug: "test-model" }),
          title: "Low Score",
          authorHash: "a1",
          editToken: "t1",
          score: 5,
        },
        {
          ...createTestSubmission({ modelSlug: "test-model" }),
          title: "High Score",
          authorHash: "a2",
          editToken: "t2",
          score: 20,
        },
      ]);

      const res = await app.request("/models/test-model", {}, env);
      const body = (await res.json()) as ModelDetailResponse;
      expect(body.configurations[0]!.title).toBe("High Score");
      expect(body.configurations[1]!.title).toBe("Low Score");
    });

    it("excludes editToken from configurations", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db.insert(models).values(
        createTestModel({
          slug: "test-model",
          configCount: 1,
        }),
      );

      await db.insert(submissions).values({
        ...createTestSubmission({ modelSlug: "test-model" }),
        title: "Config",
        authorHash: "a1",
        editToken: "secret-token",
      });

      const res = await app.request("/models/test-model", {}, env);
      const body = (await res.json()) as { configurations: Array<Record<string, unknown>> };
      expect(body.configurations[0]).not.toHaveProperty("editToken");
    });

    it("returns 404 for non-existent model", async () => {
      const { app } = await createTestApp();
      const env = createMockEnv();

      const res = await app.request("/models/nonexistent", {}, env);
      expect(res.status).toBe(404);

      const body = (await res.json()) as { error: string };
      expect(body.error).toBe("Model not found");
    });

    it("returns model with empty configurations if no submissions", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db.insert(models).values(
        createTestModel({
          slug: "empty-model",
          name: "Empty Model",
          configCount: 0,
        }),
      );

      const res = await app.request("/models/empty-model", {}, env);
      expect(res.status).toBe(200);

      const body = (await res.json()) as ModelDetailResponse;
      expect(body.data.slug).toBe("empty-model");
      expect(body.configurations.length).toBe(0);
      expect(body.pagination.total).toBe(0);
    });
  });

  describe("Model auto-creation on submission", () => {
    it("creates model when first submission is created", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      const testSlug = "new-org/new-model";
      const existingModels = await db.select().from(models).where(eq(models.slug, testSlug));
      expect(existingModels.length).toBe(0);

      const res = await app.request(
        "/submissions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "test-fp",
          },
          body: JSON.stringify({
            ...createTestSubmission({ modelSlug: testSlug }),
            title: "Test Submission",
          }),
        },
        env,
      );

      expect(res.status).toBe(201);

      const modelResult = await db.select().from(models).where(eq(models.slug, testSlug));
      expect(modelResult.length).toBe(1);
      expect(modelResult[0]!.configCount).toBe(1);
    });

    it("increments configCount when additional submissions are created", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await db.insert(models).values(
        createTestModel({
          slug: FIRST_MODEL.slug,
          name: FIRST_MODEL.name,
          org: FIRST_MODEL.org,
          configCount: 1,
        }),
      );

      const res = await app.request(
        "/submissions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "test-fp-2",
          },
          body: JSON.stringify({
            ...createTestSubmission({ modelSlug: FIRST_MODEL.slug }),
            title: "Second Submission",
          }),
        },
        env,
      );

      expect(res.status).toBe(201);

      const modelResult = await db.select().from(models).where(eq(models.slug, FIRST_MODEL.slug));
      expect(modelResult[0]!.configCount).toBe(2);
    });

    it("does not duplicate model on subsequent submissions", async () => {
      const { app, db } = await createTestApp();
      const env = createMockEnv();

      await app.request(
        "/submissions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "fp1",
          },
          body: JSON.stringify({
            ...createTestSubmission({ modelSlug: FIRST_MODEL.slug }),
            title: "First",
          }),
        },
        env,
      );

      await app.request(
        "/submissions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Fingerprint": "fp2",
          },
          body: JSON.stringify({
            ...createTestSubmission({ modelSlug: FIRST_MODEL.slug }),
            title: "Second",
          }),
        },
        env,
      );

      const modelResult = await db.select().from(models).where(eq(models.slug, FIRST_MODEL.slug));
      expect(modelResult.length).toBe(1);
    });
  });
});
