import type {
  HFModelResult,
  Submission,
  SubmissionInput,
  SubmissionUpdate,
} from "@sharellama/model";
import type {
  CommentNode,
  CreateCommentInput,
  VoteCommentInput,
} from "@sharellama/model/schemas/comment";
import type { Model, ModelSpec } from "@sharellama/model/schemas/model";
import type { CreateVoteInput, VoteValue } from "@sharellama/model/schemas/vote";

import { fetchWithRetry } from "./apiUtils";
import { getUiConfig } from "./config";

export const DEFAULT_STATS = { totalSubmissions: 0, totalVotes: 0, uniqueGpus: 0, uniqueModels: 0 };
export const DEFAULT_META: FilterMeta = { models: [], gpus: [], runtimes: [], quantizations: [] };
export const DEFAULT_SUBMISSIONS: SubmissionsListResponse = {
  data: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
};

export interface FilterMeta {
  models: Array<{ name: string; count: number }>;
  gpus: Array<{ name: string; count: number }>;
  runtimes: Array<{ name: string; count: number }>;
  quantizations: Array<{ name: string; count: number }>;
}

export interface SubmissionFilters {
  q?: string;
  page?: number;
  limit?: number;
  sort?: "score" | "createdAt" | "tokensPerSecond";
  order?: "asc" | "desc";
  model?: string[];
  gpu?: string[];
  cpu?: string;
  quantization?: string[];
  runtime?: string[];
  minTps?: number;
}

export interface SubmissionsListResponse {
  data: Array<Submission & { userVote?: VoteValue | null }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ModelDetailResponse {
  data: Model;
  hfMetadata?: {
    downloads: number;
    likes: number;
  } | null;
  configurations: Submission[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const result = await fetchWithRetry<T>(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!result.ok) {
      throw result.error;
    }

    return result.data;
  }

  private async requestWithDefault<T>(
    path: string,
    defaultValue: T,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const result = await fetchWithRetry<T>(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!result.ok) {
      if (options.signal?.aborted) {
        throw new Error("Aborted");
      }
      console.error(`API request failed: ${path}`, result.error);
      return defaultValue;
    }

    return result.data;
  }

  async getSubmissions(filters: SubmissionFilters = {}): Promise<SubmissionsListResponse> {
    const params = new URLSearchParams();

    if (filters.q) params.set("q", filters.q);
    params.set("page", String(filters.page ?? 1));
    params.set("limit", String(filters.limit ?? 20));
    params.set("sort", filters.sort ?? "createdAt");
    params.set("order", filters.order ?? "desc");
    if (filters.model && filters.model.length > 0) {
      filters.model.forEach((m) => params.append("model", m));
    }
    if (filters.gpu && filters.gpu.length > 0) {
      filters.gpu.forEach((g) => params.append("gpu", g));
    }
    if (filters.cpu) params.set("cpu", filters.cpu);
    if (filters.quantization && filters.quantization.length > 0) {
      filters.quantization.forEach((q) => params.append("quantization", q));
    }
    if (filters.runtime && filters.runtime.length > 0) {
      filters.runtime.forEach((r) => params.append("runtime", r));
    }
    if (filters.minTps !== undefined) params.set("minTps", String(filters.minTps));

    return this.requestWithDefault<SubmissionsListResponse>(
      `/submissions?${params.toString()}`,
      DEFAULT_SUBMISSIONS,
    );
  }

  async getSubmissionsMeta(): Promise<FilterMeta> {
    return this.requestWithDefault<FilterMeta>("/submissions/meta", DEFAULT_META);
  }

  async getStats(): Promise<{
    totalSubmissions: number;
    totalVotes: number;
    uniqueGpus: number;
    uniqueModels: number;
  }> {
    return this.requestWithDefault<{
      totalSubmissions: number;
      totalVotes: number;
      uniqueGpus: number;
      uniqueModels: number;
    }>("/submissions/stats", DEFAULT_STATS);
  }

  async getSubmission(id: number): Promise<Submission> {
    return this.request<Submission>(`/submissions/${id}`);
  }

  async createSubmission(
    data: SubmissionInput,
    turnstileToken: string,
    fingerprint: string,
  ): Promise<{ submission: Submission; editToken: string }> {
    return this.request<{ submission: Submission; editToken: string }>("/submissions", {
      method: "POST",
      body: JSON.stringify({ ...data, fingerprint }),
      headers: {
        "X-Turnstile-Token": turnstileToken,
      },
    });
  }

  async updateSubmission(id: number, data: SubmissionUpdate, token: string): Promise<Submission> {
    return this.request<Submission>(`/submissions/${id}?token=${token}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteSubmission(id: number, token: string): Promise<void> {
    return this.request<void>(`/submissions/${id}?token=${token}`, {
      method: "DELETE",
    });
  }

  async voteSubmission(
    submissionId: number,
    value: VoteValue,
    fingerprint: string,
  ): Promise<{ score: number; userVote: VoteValue | null }> {
    return this.request<{ score: number; userVote: VoteValue | null }>(
      `/submissions/${submissionId}/vote`,
      {
        method: "POST",
        body: JSON.stringify({ value } as CreateVoteInput),
        headers: {
          "X-Fingerprint": fingerprint,
        },
      },
    );
  }

  async getSubmissionVote(
    submissionId: number,
    fingerprint: string,
  ): Promise<{ value: VoteValue | null }> {
    return this.request<{ value: VoteValue | null }>(`/submissions/${submissionId}/vote`, {
      headers: {
        "X-Fingerprint": fingerprint,
      },
    });
  }

  async getComments(submissionId: number): Promise<{ data: CommentNode[] }> {
    return this.request<{ data: CommentNode[] }>(
      `/submissions/${submissionId}/comments?include=all`,
    );
  }

  async createComment(
    submissionId: number,
    data: CreateCommentInput,
    turnstileToken: string,
    fingerprint: string,
  ): Promise<{ data: CommentNode }> {
    return this.request<{ data: CommentNode }>(`/submissions/${submissionId}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "X-Turnstile-Token": turnstileToken,
        "X-Fingerprint": fingerprint,
      },
    });
  }

  async voteComment(
    commentId: number,
    value: VoteValue,
    fingerprint: string,
    signal?: AbortSignal,
  ): Promise<{ data: CommentNode }> {
    return this.request<{ data: CommentNode }>(`/comments/${commentId}/vote`, {
      method: "POST",
      body: JSON.stringify({ value } as VoteCommentInput),
      headers: {
        "X-Fingerprint": fingerprint,
      },
      ...(signal ? { signal } : {}),
    });
  }

  async deleteComment(commentId: number, fingerprint: string): Promise<{ data: CommentNode }> {
    return this.request<{ data: CommentNode }>(`/comments/${commentId}`, {
      method: "DELETE",
      headers: {
        "X-Fingerprint": fingerprint,
      },
    });
  }

  async searchModels(query: string, signal?: AbortSignal): Promise<HFModelResult[]> {
    const params = new URLSearchParams({ q: query, limit: "10" });
    const result = await this.requestWithDefault<{ data: HFModelResult[] }>(
      `/models/search?${params.toString()}`,
      { data: [] },
      signal ? { signal } : undefined,
    );
    return result.data;
  }

  async getModels(params: {
    q?: string;
    sort?: "configCount" | "createdAt";
    order?: "asc" | "desc";
    page?: number;
    limit?: number;
  }): Promise<{
    data: Model[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const searchParams = new URLSearchParams();
    if (params.q) searchParams.set("q", params.q);
    if (params.sort) searchParams.set("sort", params.sort);
    if (params.order) searchParams.set("order", params.order);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.limit) searchParams.set("limit", String(params.limit));

    return this.request(`/models?${searchParams.toString()}`);
  }

  async ensureModel(slug: string): Promise<{ data: Model; created: boolean }> {
    return this.request<{ data: Model; created: boolean }>(`/models/ensure`, {
      method: "POST",
      body: JSON.stringify({ slug }),
    });
  }

  async getModel(slug: string): Promise<ModelDetailResponse> {
    return this.request<ModelDetailResponse>(`/models/${encodeURIComponent(slug)}`);
  }

  async getModelSpecs(slug: string): Promise<{ data: ModelSpec[] }> {
    return this.request<{ data: ModelSpec[] }>(`/models/${encodeURIComponent(slug)}/specs`);
  }

  async populateModels(options?: { limit?: number; force?: boolean }): Promise<{
    added: number;
    updated: number;
    total: number;
    lastPopulated: string;
  }> {
    return this.request<{
      added: number;
      updated: number;
      total: number;
      lastPopulated: string;
    }>("/models/populate", {
      method: "POST",
      body: JSON.stringify({
        limit: options?.limit ?? 100,
        force: options?.force ?? false,
      }),
    });
  }

  async getPopulateStatus(): Promise<{
    lastRun: string | null;
    nextRun: string | null;
    isStale: boolean;
    enabled: boolean;
  }> {
    return this.request<{
      lastRun: string | null;
      nextRun: string | null;
      isStale: boolean;
      enabled: boolean;
    }>("/models/populate/status");
  }

  async triggerPopulate(): Promise<{
    success: boolean;
    stats?: Record<string, number | string>;
  }> {
    return this.request<{
      success: boolean;
      stats?: Record<string, number | string>;
    }>("/models/populate/trigger", {
      method: "POST",
    });
  }
}

export const api = new ApiClient(getUiConfig().api.url);
