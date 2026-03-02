import { getUiConfig } from "./config";

export interface HFModel {
  id: string;
  downloads: number;
  likes: number;
  pipeline_tag?: string;
}

function getApiBase(): string {
  return getUiConfig().api.url;
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

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch {
    return null;
  }
}

interface HFBackendResponse {
  models: HFModel[];
  source: string;
}

export async function getTrendingModels(limit = 10): Promise<HFModel[]> {
  const data = await fetchWithTimeout<HFBackendResponse>(`${getApiBase()}/hf/trending`);

  if (!data?.models) {
    return getTopLikedModels(limit);
  }

  return data.models.slice(0, limit);
}

export async function getTopLikedModels(limit = 10): Promise<HFModel[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    sort: "likes",
    direction: "-1",
  });

  const data = await fetchWithTimeout<HFBackendResponse>(`${getApiBase()}/hf/top-liked?${params}`);

  return data?.models ?? [];
}

export async function getTopDownloadedModels(limit = 10): Promise<HFModel[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    sort: "downloads",
    direction: "-1",
  });

  const data = await fetchWithTimeout<HFModel[]>(`https://huggingface.co/api/models?${params}`);

  return data ?? [];
}

export function formatModelName(modelId: string): string {
  const parts = modelId.split("/");
  return parts.length > 1 ? (parts[1] as string) : modelId;
}

export function formatDownloads(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return String(count);
}
