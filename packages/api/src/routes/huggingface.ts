import { hfCache } from "@sharellama/database";

import type { Env } from "../env";
import { getConfig } from "../env";
import { getDb } from "../lib/db";
import { extractAvatarFromHfHtml, HF_AVATAR_PLACEHOLDER } from "../lib/huggingfaceAvatar";
import { logError } from "../lib/logging";

import { eq } from "drizzle-orm";
import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

const HF_API_BASE = "https://huggingface.co/api";
const CACHE_TTL_MS = 15 * 60 * 1000;

interface CachedTrendingData {
  models: HFModel[];
  source: string;
}

interface TFTrendingResponse {
  recentlyTrending: Array<{
    repoData: {
      id: string;
      downloads: number;
      likes: number;
      pipeline_tag?: string;
      author?: string;
    };
    repoType: string;
  }>;
}

interface HFModel {
  id: string;
  downloads: number;
  likes: number;
  pipeline_tag?: string;
  author?: string;
  authorAvatar?: string;
}

interface HFModelDetail {
  id: string;
  modelId: string;
  author: string;
  downloads: number;
  likes: number;
  pipeline_tag?: string;
  library_name?: string;
  tags: string[];
  siblings?: Array<{ rfilename: string }>;
}

interface HFTreeFile {
  type: string;
  path: string;
  size: number;
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

function extractQuantName(filename: string): string {
  const match = filename.match(/-(Q\d_[A-Z_]+|IQ\d_[A-Z_]+|Q\d_\d+|Q\d)\.gguf$/i);
  if (match && match[1]) return match[1];
  const name = filename.replace(/\.gguf$/i, "");
  const parts = name.split("-");
  return parts[parts.length - 1] || name;
}

function extractProvider(repoId: string): string {
  return repoId.split("/")[0] || "unknown";
}

const orgAvatarCache = new Map<string, string>();

async function fetchOrgAvatar(org: string): Promise<string> {
  const orgKey = org.toLowerCase();
  if (orgAvatarCache.has(orgKey)) {
    return orgAvatarCache.get(orgKey)!;
  }

  try {
    const response = await fetch(`https://huggingface.co/${org}`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      orgAvatarCache.set(orgKey, HF_AVATAR_PLACEHOLDER);
      return HF_AVATAR_PLACEHOLDER;
    }

    const html = await response.text();
    const avatarUrl = extractAvatarFromHfHtml(html) ?? HF_AVATAR_PLACEHOLDER;
    orgAvatarCache.set(orgKey, avatarUrl);
    return avatarUrl;
  } catch {
    orgAvatarCache.set(orgKey, HF_AVATAR_PLACEHOLDER);
    return HF_AVATAR_PLACEHOLDER;
  }
}

async function getCachedTrending(db: ReturnType<typeof getDb>): Promise<CachedTrendingData | null> {
  const cached = await db.select().from(hfCache).where(eq(hfCache.key, "trending")).limit(1);
  if (!cached[0]) return null;

  const age = Date.now() - cached[0].fetchedAt.getTime();
  if (age > CACHE_TTL_MS) return null;

  return cached[0].data as CachedTrendingData;
}

async function setCachedTrending(
  db: ReturnType<typeof getDb>,
  data: CachedTrendingData,
): Promise<void> {
  await db
    .insert(hfCache)
    .values({ key: "trending", data, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: hfCache.key,
      set: { data, fetchedAt: new Date() },
    });
}

app.get("/trending", async (c) => {
  const db = getDb(getConfig(c.env).db.url);

  const cached = await getCachedTrending(db);
  if (cached) {
    return c.json(cached);
  }

  try {
    const data = await fetchWithTimeout<TFTrendingResponse>(`${HF_API_BASE}/trending`);

    if (data?.recentlyTrending) {
      const trendingItems = data.recentlyTrending
        .filter((item) => item.repoType === "model")
        .slice(0, 10);

      const models = await Promise.all(
        trendingItems.map(async (item) => {
          const author = item.repoData.id.split("/")[0] ?? "";
          const authorAvatar = author ? await fetchOrgAvatar(author) : undefined;
          return {
            id: item.repoData.id,
            downloads: item.repoData.downloads,
            likes: item.repoData.likes,
            pipeline_tag: item.repoData.pipeline_tag,
            author,
            authorAvatar,
          };
        }),
      );

      const result: CachedTrendingData = { models, source: "trending" };
      await setCachedTrending(db, result);
      return c.json(result);
    }

    return c.redirect("/hf/top-liked");
  } catch (error) {
    logError("HF trending fetch failed", { error });
    return c.redirect("/hf/top-liked");
  }
});

app.get("/top-liked", async (c) => {
  try {
    const params = new URLSearchParams({
      limit: "10",
      sort: "likes",
      direction: "-1",
    });

    const data = await fetchWithTimeout<HFModel[]>(`${HF_API_BASE}/models?${params}`);

    if (!data) {
      return c.json({ error: "Unable to fetch models" }, 502);
    }

    return c.json({ models: data, source: "top-liked" });
  } catch (error) {
    logError("HF top-liked fetch failed", { error });
    return c.json({ error: "Unable to fetch models" }, 502);
  }
});

app.get("/models/:slug", async (c) => {
  const slug = c.req.param("slug");

  const data = await fetchWithTimeout<HFModelDetail>(`${HF_API_BASE}/models/${slug}`);

  if (!data) {
    return c.json({ error: "Model not found" }, 404);
  }

  return c.json({
    data: {
      id: data.id,
      modelId: data.modelId,
      author: data.author,
      downloads: data.downloads,
      likes: data.likes,
      pipeline_tag: data.pipeline_tag ?? null,
      library_name: data.library_name ?? null,
      tags: data.tags,
    },
  });
});

app.get("/models/:slug/quantizations", async (c) => {
  const slug = c.req.param("slug");
  const nameParts = slug.split("/");
  const modelName = nameParts.slice(1).join("/");

  const params = new URLSearchParams({
    search: `${modelName} GGUF`,
    limit: "20",
  });

  const data = await fetchWithTimeout<
    Array<{ id: string; downloads: number; likes: number; tags: string[] }>
  >(`${HF_API_BASE}/models?${params}`);

  if (!data) {
    return c.json({ data: [] });
  }

  const quantRepos = data
    .filter((m) => m.tags.includes("gguf") || m.id.toLowerCase().includes("gguf"))
    .filter((m) => m.id.includes(modelName) || m.tags.some((t) => t.includes(modelName)))
    .map((m) => ({
      id: m.id,
      provider: extractProvider(m.id),
      downloads: m.downloads,
      likes: m.likes,
      quantType: "GGUF",
      url: `https://huggingface.co/${m.id}`,
    }));

  return c.json({ data: quantRepos });
});

app.get("/repos/:repoId{.*}/files", async (c) => {
  const repoId = c.req.param("repoId");

  const [repoInfo, tree] = await Promise.all([
    fetchWithTimeout<HFModelDetail>(`${HF_API_BASE}/models/${repoId}`),
    fetchWithTimeout<HFTreeFile[]>(`${HF_API_BASE}/models/${repoId}/tree/main`),
  ]);

  if (!tree) {
    return c.json({ files: [] });
  }

  const ggufFiles = tree.filter((f) => f.type === "file" && f.path.toLowerCase().endsWith(".gguf"));

  const files = ggufFiles.map((f) => ({
    name: extractQuantName(f.path),
    filename: f.path,
    sizeBytes: f.size,
    url: `https://huggingface.co/${repoId}/resolve/main/${f.path}`,
  }));

  return c.json({
    repo: repoInfo
      ? {
          id: repoInfo.id,
          downloads: repoInfo.downloads,
          likes: repoInfo.likes,
        }
      : null,
    files,
  });
});

export default app;
