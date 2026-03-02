import type {
  Submission,
  SubmissionInput,
  SubmissionUpdate,
  HFModelResult,
} from "@sharellama/model";
import type { Model } from "@sharellama/model/schemas/model";
import type { VoteValue, CreateVoteInput } from "@sharellama/model/schemas/vote";
import type {
  CommentNode,
  CreateCommentInput,
  VoteCommentInput,
} from "@sharellama/model/schemas/comment";

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

export interface FilterMeta {
  models: Array<{ name: string; count: number }>;
  gpus: Array<{ name: string; count: number }>;
  runtimes: Array<{ name: string; count: number }>;
  quantizations: Array<{ name: string; count: number }>;
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

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClientConfig {
  baseUrl: string;
  retryCount?: number;
  retryDelay?: number;
}

export class ApiClient {
  private baseUrl: string;
  private retryCount: number;
  private retryDelay: number;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.retryCount = config.retryCount ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new ApiError(
            errorData.error || `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            errorData,
          );
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");

        if (attempt < this.retryCount) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new ApiError("Request failed after retries");
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

    return this.request<SubmissionsListResponse>(`/submissions?${params.toString()}`);
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
  ): Promise<{ data: CommentNode }> {
    return this.request<{ data: CommentNode }>(`/comments/${commentId}/vote`, {
      method: "POST",
      body: JSON.stringify({ value } as VoteCommentInput),
      headers: {
        "X-Fingerprint": fingerprint,
      },
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

  async searchModels(query: string): Promise<HFModelResult[]> {
    const params = new URLSearchParams({ q: query, limit: "10" });
    const result = await this.request<{ data: HFModelResult[] }>(
      `/models/search?${params.toString()}`,
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

  async getStats(): Promise<{
    totalSubmissions: number;
    totalVotes: number;
    uniqueGpus: number;
    uniqueModels: number;
  }> {
    return this.request(`/submissions/stats`);
  }

  async getSubmissionsMeta(): Promise<FilterMeta> {
    return this.request<FilterMeta>("/submissions/meta");
  }
}
