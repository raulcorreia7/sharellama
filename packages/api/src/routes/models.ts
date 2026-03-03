import { zValidator } from "@hono/zod-validator";

import {
  hfCache,
  models,
  modelSpecs,
  orgAvatars,
  scheduledTasks,
  submissions,
} from "@sharellama/database";
import {
  createModelSchema,
  createModelSpecSchema,
  listModelsQuerySchema,
  updateModelSpecSchema,
} from "@sharellama/model";

import type { Env } from "../env";
import { getConfig } from "../env";
import { getDb } from "../lib/db";
import { getRunningTasks, runTaskNow } from "../lib/tasks";

import { and, asc, desc, eq, ilike, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

const app = new Hono<{ Bindings: Env }>();

const HF_API = "https://huggingface.co/api";

const ORG_AVATAR_PLACEHOLDER = "https://huggingface.co/front/assets/huggingface_logo-noborder.svg";

const orgAvatarCache = new Map<string, string>();

async function fetchAndCacheOrgAvatar(db: ReturnType<typeof getDb>, org: string): Promise<string> {
  const orgLower = org.toLowerCase();

  if (orgAvatarCache.has(orgLower)) {
    return orgAvatarCache.get(orgLower)!;
  }

  const cached = await db.select().from(orgAvatars).where(eq(orgAvatars.org, orgLower)).limit(1);

  if (cached[0]) {
    orgAvatarCache.set(orgLower, cached[0].avatarUrl);
    return cached[0].avatarUrl;
  }

  try {
    const response = await fetch(`https://huggingface.co/${org}`, {
      signal: AbortSignal.timeout(3000),
    });

    let avatarUrl: string | null = null;

    if (response.ok) {
      const html = await response.text();
      const match = html.match(
        /avatarUrl&quot;:&quot;(https:\/\/cdn-avatars\.huggingface\.co[^"&]+)&quot;/,
      );

      if (match && match[1]) {
        avatarUrl = match[1];
      }
    }

    if (!avatarUrl) {
      avatarUrl = ORG_AVATAR_PLACEHOLDER;
    }

    await db
      .insert(orgAvatars)
      .values({
        org: orgLower,
        avatarUrl,
        fetchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: orgAvatars.org,
        set: {
          avatarUrl,
          fetchedAt: new Date(),
        },
      });

    orgAvatarCache.set(orgLower, avatarUrl);
    return avatarUrl;
  } catch {
    await db
      .insert(orgAvatars)
      .values({
        org: orgLower,
        avatarUrl: ORG_AVATAR_PLACEHOLDER,
        fetchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: orgAvatars.org,
        set: {
          avatarUrl: ORG_AVATAR_PLACEHOLDER,
          fetchedAt: new Date(),
        },
      });

    orgAvatarCache.set(orgLower, ORG_AVATAR_PLACEHOLDER);
    return ORG_AVATAR_PLACEHOLDER;
  }
}

function parseYamlFrontmatter(frontmatter: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = frontmatter.split("\n");

  for (const line of lines) {
    const match = line.match(/^(\s*)([\w-]+):\s*(.*)$/);
    if (!match) continue;

    const [, indent, key, valueStr] = match;
    if (indent && indent.length > 0) continue;
    if (!key) continue;

    const parsedValue = valueStr?.trim() ?? "";
    if (parsedValue === "true") result[key] = true;
    else if (parsedValue === "false") result[key] = false;
    else if (parsedValue === "null") result[key] = null;
    else if (/^-?\d+$/.test(parsedValue)) result[key] = parseInt(parsedValue, 10);
    else if (/^-?\d+\.\d+$/.test(parsedValue)) result[key] = parseFloat(parsedValue);
    else if (parsedValue.startsWith("[") && parsedValue.endsWith("]")) {
      const items = parsedValue
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
      result[key] = items;
    } else if (parsedValue.startsWith('"') || parsedValue.startsWith("'")) {
      result[key] = parsedValue.slice(1, -1);
    } else {
      result[key] = parsedValue;
    }
  }

  return result;
}

function calculateMoEActiveParams(configData: Record<string, unknown>): string | undefined {
  const numLocalExperts = configData.num_local_experts as number | undefined;
  const numExperts = configData.num_experts as number | undefined;
  const intermediateSize = configData.intermediate_size as number | undefined;
  const hiddenSize = (configData.hidden_size as number | undefined) ?? 0;

  const experts = numLocalExperts ?? numExperts;
  if (!experts || typeof experts !== "number") return undefined;

  const numExpertsPerTok = configData.num_experts_per_tok as number | undefined;
  if (numExpertsPerTok && intermediateSize && hiddenSize) {
    const activeExperts = Math.min(numExpertsPerTok, experts);
    const activeIntermediate = Math.round((intermediateSize * activeExperts) / experts);
    const activeParams = (activeIntermediate * activeExperts * hiddenSize) / 1e9;
    return `${activeParams.toFixed(1)}B`;
  }

  return undefined;
}

async function fetchModelSpecsFromHF(slug: string): Promise<{
  sourceType: "hf_readme";
  sourceUrl: string;
  architecture?: string;
  parameterCount?: string;
  activeParameters?: string;
  layers?: number;
  hiddenSize?: number;
  attentionHeads?: number;
  contextWindow?: number;
  kvHeads?: number;
  headDim?: number;
  attentionType?: string;
  multimodal?: boolean;
  supportedModalities?: string[];
} | null> {
  try {
    const readmeResponse = await fetch(`https://huggingface.co/${slug}/raw/main/README.md`, {
      signal: AbortSignal.timeout(10000),
    });

    const readme = readmeResponse.ok ? await readmeResponse.text() : null;

    let yamlData: Record<string, unknown> | null = null;
    if (readme) {
      const yamlMatch = readme.match(/^---\n([\s\S]*?)\n---/);
      if (yamlMatch && yamlMatch[1]) {
        yamlData = parseYamlFrontmatter(yamlMatch[1]);
      }
    }

    const configResponse = await fetch(`https://huggingface.co/${slug}/raw/main/config.json`, {
      signal: AbortSignal.timeout(5000),
    });

    let configData: Record<string, unknown> | null = null;
    if (configResponse.ok) {
      configData = await configResponse.json();
    }

    const specs = {
      sourceType: "hf_readme" as const,
      sourceUrl: `https://huggingface.co/${slug}`,
      architecture: undefined as string | undefined,
      parameterCount: undefined as string | undefined,
      activeParameters: undefined as string | undefined,
      layers: undefined as number | undefined,
      hiddenSize: undefined as number | undefined,
      attentionHeads: undefined as number | undefined,
      contextWindow: undefined as number | undefined,
      kvHeads: undefined as number | undefined,
      headDim: undefined as number | undefined,
      attentionType: undefined as string | undefined,
      multimodal: undefined as boolean | undefined,
      supportedModalities: undefined as string[] | undefined,
    };

    if (configData) {
      specs.layers = configData.num_hidden_layers as number | undefined;
      specs.hiddenSize = configData.hidden_size as number | undefined;
      specs.attentionHeads = configData.num_attention_heads as number | undefined;
      specs.contextWindow = configData.max_position_embeddings as number | undefined;
      specs.kvHeads = configData.num_key_value_heads as number | undefined;
      specs.headDim = configData.head_dim as number | undefined;

      const architectures = configData.architectures as string[] | undefined;
      specs.architecture = architectures?.[0] ?? "Unknown";

      const vocabSize = configData.vocab_size as number | undefined;
      if (vocabSize && specs.hiddenSize) {
        specs.parameterCount = `${((vocabSize * specs.hiddenSize) / 1e9).toFixed(1)}B`;
      }

      if (configData.num_experts || configData.num_local_experts) {
        specs.architecture = "MoE";
        specs.activeParameters = calculateMoEActiveParams(configData);
      }

      const attentionImplementations = configData._attn_implementation_internal as
        | string
        | undefined;
      if (attentionImplementations) {
        specs.attentionType = attentionImplementations;
      }

      const multimodalConfig = configData.vision_config as Record<string, unknown> | undefined;
      if (multimodalConfig) {
        specs.multimodal = true;
        specs.supportedModalities = ["text", "image"];
      }
    }

    if (yamlData) {
      const tags = yamlData.tags as string[] | undefined;
      if (tags) {
        const pipelineTag = tags.find((t) => t.includes("task:"));
        if (pipelineTag && specs.architecture) {
          specs.architecture = `${specs.architecture} (${pipelineTag})`;
        }
      }

      const license = yamlData.license as string | undefined;
      if (license && specs.architecture) {
        specs.architecture = `${specs.architecture} [${license}]`;
      }
    }

    return specs;
  } catch (error) {
    console.error(`Failed to fetch specs from HF for ${slug}:`, error);
    return null;
  }
}

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

async function fetchAndCacheHfMetadata(db: ReturnType<typeof getDb>, slug: string): Promise<void> {
  try {
    const hfData = await fetchWithTimeout<HFModel>(`${HF_API}/models/${slug}`, 10000);

    if (!hfData) {
      console.error(`Failed to fetch HF metadata for ${slug}`);
      return;
    }

    const cacheKey = `hf_model_${slug}`;
    const metadata = {
      downloads: hfData.downloads,
      likes: hfData.likes,
    };

    await db
      .insert(hfCache)
      .values({
        key: cacheKey,
        data: metadata,
        fetchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: hfCache.key,
        set: { data: metadata, fetchedAt: new Date() },
      });

    const [org] = slug.split("/");
    if (org) {
      await fetchAndCacheOrgAvatar(db, org);
    }
  } catch (error) {
    console.error(`Background metadata fetch failed for ${slug}:`, error);
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

  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const now = Date.now();

  const resultsWithMetadata = await Promise.all(
    results.map(async (model) => {
      const cacheKey = `hf_model_${model.slug}`;
      const cached = await db.select().from(hfCache).where(eq(hfCache.key, cacheKey)).limit(1);

      let hfMetadata = null;
      if (cached[0] && now - new Date(cached[0].fetchedAt).getTime() < CACHE_TTL) {
        hfMetadata = cached[0].data as { downloads: number; likes: number };
      }

      return {
        ...model,
        downloads: hfMetadata?.downloads ?? null,
        likes: hfMetadata?.likes ?? null,
      };
    }),
  );

  return c.json({
    data: resultsWithMetadata,
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

app.post("/ensure", zValidator("json", createModelSchema), async (c) => {
  const db = getDb(getConfig(c.env).db.url);
  const { slug } = c.req.valid("json");

  const existing = await db.select().from(models).where(eq(models.slug, slug)).limit(1);
  if (existing[0]) {
    return c.json({ data: existing[0], created: false });
  }

  const hfData = await fetchWithTimeout<HFModel>(`${HF_API}/models/${slug}`);
  if (!hfData) {
    return c.json({ error: "Model not found on Hugging Face" }, 404);
  }

  const [org, ...nameParts] = slug.split("/");
  const name = nameParts.join("/") || slug;
  const orgAvatar = org ? await fetchAndCacheOrgAvatar(db, org) : null;

  const [created] = await db
    .insert(models)
    .values({
      slug,
      name,
      org: org || null,
      orgAvatar: orgAvatar || null,
      configCount: 0,
    })
    .returning();

  return c.json({ data: created, created: true });
});

const populateSchema = z.object({
  limit: z.number().min(1).max(500).optional().default(100),
  force: z.boolean().optional().default(false),
});

app.post("/populate", zValidator("json", populateSchema), async (c) => {
  const db = getDb(getConfig(c.env).db.url);
  const { limit, force } = c.req.valid("json");

  const running = getRunningTasks();
  if (running.includes("refresh_models") && !force) {
    return c.json({ error: "Population already in progress" }, 409);
  }

  const params = new URLSearchParams({
    filter: SUPPORTED_PIPELINES.join(","),
    limit: String(limit),
    sort: "downloads",
    direction: "-1",
  });

  const data = await fetchWithTimeout<HFModel[]>(`${HF_API}/models?${params}`, 60000);

  if (!data) {
    return c.json({ error: "Failed to fetch models from HuggingFace API" }, 502);
  }

  let added = 0;
  let updated = 0;

  for (const hfModel of data) {
    const slug = hfModel.id;
    const parts = slug.split("/");
    const name = (parts.length > 1 ? parts[1] : parts[0]) || slug;
    const org = parts.length > 1 ? parts[0] || null : null;

    const existing = await db.select().from(models).where(eq(models.slug, slug)).limit(1);

    if (existing.length === 0) {
      await db.insert(models).values({
        slug,
        name,
        org,
        configCount: 0,
      });
      added++;
    } else {
      updated++;
    }
  }

  const now = new Date();
  const task = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.name, "refresh_models"))
    .limit(1);

  if (task[0]) {
    const nextRunTime = new Date(now.getTime() + task[0].intervalSeconds * 1000);
    await db
      .update(scheduledTasks)
      .set({
        lastRun: now,
        nextRun: nextRunTime,
        lastError: null,
      })
      .where(eq(scheduledTasks.name, "refresh_models"));
  }

  return c.json({
    added,
    updated,
    total: data.length,
    lastPopulated: now.toISOString(),
  });
});

app.get("/populate/status", async (c) => {
  const db = getDb(getConfig(c.env).db.url);

  const task = await db
    .select()
    .from(scheduledTasks)
    .where(eq(scheduledTasks.name, "refresh_models"))
    .limit(1);

  if (!task[0]) {
    return c.json({
      lastRun: null,
      nextRun: null,
      isStale: true,
      enabled: false,
    });
  }

  const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const lastRun = task[0].lastRun ? new Date(task[0].lastRun).getTime() : null;
  const isStale = !lastRun || now - lastRun > STALE_THRESHOLD_MS;

  return c.json({
    lastRun: task[0].lastRun?.toISOString() ?? null,
    nextRun: task[0].nextRun?.toISOString() ?? null,
    isStale,
    enabled: task[0].enabled,
  });
});

app.post("/populate/trigger", async (c) => {
  const db = getDb(getConfig(c.env).db.url);

  const running = getRunningTasks();
  if (running.includes("refresh_models")) {
    return c.json({ error: "Population already in progress" }, 409);
  }

  const result = await runTaskNow(db, c.env, "refresh_models");

  if (!result.success) {
    return c.json({ error: result.error ?? "Unknown error" }, 500);
  }

  return c.json({
    success: true,
    stats: result.stats,
  });
});

app.get("/:slug", async (c) => {
  const db = getDb(getConfig(c.env).db.url);
  const slug = c.req.param("slug");

  let model = await db.select().from(models).where(eq(models.slug, slug)).limit(1);

  if (!model[0]) {
    const [org, ...nameParts] = slug.split("/");
    const name = nameParts.join("/") || slug;

    const created = await db
      .insert(models)
      .values({
        slug,
        name,
        org: org || null,
        orgAvatar: null,
        configCount: 0,
      })
      .returning();

    model = created;

    c.executionCtx.waitUntil(
      (async () => {
        await fetchAndCacheHfMetadata(db, slug);

        const hfSpecs = await fetchModelSpecsFromHF(slug);
        if (hfSpecs) {
          await db
            .insert(modelSpecs)
            .values({
              ...hfSpecs,
              modelSlug: slug,
              isPrimary: true,
            })
            .onConflictDoNothing();
        }
      })(),
    );
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

  const sanitizedConfigs = configs.map((config) => {
    const { editToken: _, ...rest } = config;
    return rest;
  });

  let hfMetadata = null;

  const cacheKey = `hf_model_${slug}`;
  const cached = await db.select().from(hfCache).where(eq(hfCache.key, cacheKey)).limit(1);

  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const now = Date.now();

  if (cached[0] && now - new Date(cached[0].fetchedAt).getTime() < CACHE_TTL) {
    hfMetadata = cached[0].data as { downloads: number; likes: number };
  }

  const modelData = model[0]!;
  if (modelData.org && !modelData.orgAvatar) {
    const orgAvatar = await fetchAndCacheOrgAvatar(db, modelData.org);
    await db.update(models).set({ orgAvatar }).where(eq(models.slug, slug));
    modelData.orgAvatar = orgAvatar;
  }

  return c.json({
    data: modelData,
    hfMetadata,
    configurations: sanitizedConfigs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
});

app.get("/:slug/specs", async (c) => {
  const db = getDb(getConfig(c.env).db.url);
  const slug = c.req.param("slug");

  const specs = await db
    .select()
    .from(modelSpecs)
    .where(eq(modelSpecs.modelSlug, slug))
    .orderBy(desc(modelSpecs.submittedAt));

  return c.json({ data: specs });
});

app.post("/:slug/specs", zValidator("json", createModelSpecSchema), async (c) => {
  const db = getDb(getConfig(c.env).db.url);
  const slug = c.req.param("slug");
  const data = c.req.valid("json");

  const authorHash = c.req.header("X-Fingerprint") || "anonymous";

  const existingCount = await db
    .select({ count: sql<number>`count(*)` })
    .from(modelSpecs)
    .where(eq(modelSpecs.modelSlug, slug))
    .then((r) => Number(r[0]?.count ?? 0));

  const [spec] = await db
    .insert(modelSpecs)
    .values({
      ...data,
      modelSlug: slug,
      submittedBy: authorHash,
      isPrimary: existingCount === 0 ? true : data.isPrimary,
    })
    .returning();

  return c.json({ data: spec }, 201);
});

app.patch("/:slug/specs/:sourceType", zValidator("json", updateModelSpecSchema), async (c) => {
  const db = getDb(getConfig(c.env).db.url);
  const slug = c.req.param("slug");
  const sourceType = c.req.param("sourceType");
  const data = c.req.valid("json");

  const existing = await db
    .select()
    .from(modelSpecs)
    .where(and(eq(modelSpecs.modelSlug, slug), eq(modelSpecs.sourceType, sourceType)))
    .limit(1);

  if (!existing[0]) {
    return c.json({ error: "Spec not found" }, 404);
  }

  const [updated] = await db
    .update(modelSpecs)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(modelSpecs.modelSlug, slug), eq(modelSpecs.sourceType, sourceType)))
    .returning();

  return c.json({ data: updated });
});

app.get("/:slug/specs/primary", async (c) => {
  const db = getDb(getConfig(c.env).db.url);
  const slug = c.req.param("slug");

  const spec = await db
    .select()
    .from(modelSpecs)
    .where(and(eq(modelSpecs.modelSlug, slug), eq(modelSpecs.isPrimary, true)))
    .limit(1);

  if (!spec[0]) {
    return c.json({ error: "No primary spec found" }, 404);
  }

  return c.json({ data: spec[0] });
});

app.post("/:slug/specs/:sourceType/set-primary", async (c) => {
  const db = getDb(getConfig(c.env).db.url);
  const slug = c.req.param("slug");
  const sourceType = c.req.param("sourceType");

  await db.update(modelSpecs).set({ isPrimary: false }).where(eq(modelSpecs.modelSlug, slug));

  const [updated] = await db
    .update(modelSpecs)
    .set({ isPrimary: true })
    .where(and(eq(modelSpecs.modelSlug, slug), eq(modelSpecs.sourceType, sourceType)))
    .returning();

  return c.json({ data: updated });
});

export default app;
