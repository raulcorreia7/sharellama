import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { eq, desc, asc, sql, and, ilike } from "drizzle-orm";
import type { Env } from "../env";
import { getConfig } from "../env";
import { getDb } from "../lib/db";
import { models, submissions } from "@sharellama/database";
import { listModelsQuerySchema } from "@sharellama/model/schemas/model";

const app = new Hono<{ Bindings: Env }>();

const HF_API = "https://huggingface.co/api";

const SUPPORTED_PIPELINES = [
  "text-generation",
  "text2text-generation",
  "image-text-to-text",
  "conversational",
];

interface HFModel {
  id: string;
  modelId: string;
  author: string;
  downloads: number;
  likes: number;
  pipeline_tag: string | null;
  library_name: string | null;
  tags: string[];
}

async function fetchWithTimeout<T>(url: string, timeout = 5000): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

app.get("/", zValidator("query", listModelsQuerySchema), async (c) => {
  const db = getDb(getConfig(c.env).db.url);
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
      .select({ count: sql<number>`count(*)` })
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

app.get("/search", async (c) => {
  const q = c.req.query("q");
  const limit = Math.min(parseInt(c.req.query("limit") || "10"), 20);

  if (!q || q.length < 2) {
    return c.json({ data: [] });
  }

  const params = new URLSearchParams({
    search: q,
    filter: SUPPORTED_PIPELINES.join(","),
    limit: String(limit),
    sort: "downloads",
    direction: "-1",
  });

  const data = await fetchWithTimeout<HFModel[]>(`${HF_API}/models?${params}`);

  if (!data) {
    return c.json({ data: [] });
  }

  const results = data.map((m) => ({
    id: m.id,
    modelId: m.modelId,
    author: m.author,
    downloads: m.downloads,
    likes: m.likes,
    pipeline_tag: m.pipeline_tag,
    library_name: m.library_name ?? null,
  }));

  return c.json({ data: results });
});

app.get("/:slug", async (c) => {
  const db = getDb(getConfig(c.env).db.url);
  const slug = c.req.param("slug");

  const model = await db.select().from(models).where(eq(models.slug, slug)).limit(1);

  if (!model[0]) {
    return c.json({ error: "Model not found" }, 404);
  }

  const gpu = c.req.query("gpu");
  const quantization = c.req.query("quantization");
  const quantSource = c.req.query("quantSource");
  const sort = c.req.query("sort") || "score";
  const page = parseInt(c.req.query("page") || "1");
  const limit = Math.min(parseInt(c.req.query("limit") || "20"), 100);
  const offset = (page - 1) * limit;

  const conditions = [eq(submissions.modelSlug, slug)];
  if (gpu) conditions.push(ilike(submissions.gpu, `%${gpu}%`));
  if (quantization) conditions.push(eq(submissions.quantization, quantization));
  if (quantSource) conditions.push(eq(submissions.quantSource, quantSource));

  const sortColumn =
    {
      score: submissions.score,
      createdAt: submissions.createdAt,
      tokensPerSecond: submissions.tokensPerSecond,
    }[sort] || submissions.score;

  const [configs, countResult] = await Promise.all([
    db
      .select()
      .from(submissions)
      .where(and(...conditions))
      .orderBy(desc(sortColumn))
      .limit(limit)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)` })
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

export default app;
