import type {
  Submission,
  SubmissionInput,
  SubmissionUpdate,
  PaginatedResponse,
  ApiError,
} from "@locallama/shared";
import type { VoteValue, CreateVoteInput } from "@locallama/shared/schemas/vote";
import type {
  CommentNode,
  CreateCommentInput,
  VoteCommentInput,
} from "@locallama/shared/schemas/comment";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: "Unknown error",
      }));
      throw new Error(error.message ?? error.error);
    }

    return response.json();
  }

  async getSubmissions(
    page = 1,
    pageSize = 20
  ): Promise<PaginatedResponse<Submission>> {
    return this.request<PaginatedResponse<Submission>>(
      `/submissions?page=${page}&pageSize=${pageSize}`
    );
  }

  async getSubmission(id: number): Promise<Submission> {
    return this.request<Submission>(`/submissions/${id}`);
  }

  async createSubmission(
    data: SubmissionInput,
    turnstileToken: string,
    fingerprint: string
  ): Promise<{ submission: Submission; editToken: string }> {
    return this.request<{ submission: Submission; editToken: string }>(
      "/submissions",
      {
        method: "POST",
        body: JSON.stringify({ ...data, fingerprint }),
        headers: {
          "X-Turnstile-Token": turnstileToken,
        },
      }
    );
  }

  async updateSubmission(
    id: number,
    data: SubmissionUpdate,
    token: string
  ): Promise<Submission> {
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
    fingerprint: string
  ): Promise<{ score: number; userVote: VoteValue | null }> {
    return this.request<{ score: number; userVote: VoteValue | null }>(
      `/submissions/${submissionId}/vote`,
      {
        method: "POST",
        body: JSON.stringify({ value } as CreateVoteInput),
        headers: {
          "X-Fingerprint": fingerprint,
        },
      }
    );
  }

  async getSubmissionVote(
    submissionId: number,
    fingerprint: string
  ): Promise<{ value: VoteValue | null }> {
    return this.request<{ value: VoteValue | null }>(
      `/submissions/${submissionId}/vote`,
      {
        headers: {
          "X-Fingerprint": fingerprint,
        },
      }
    );
  }

  async getComments(submissionId: number): Promise<{ data: CommentNode[] }> {
    return this.request<{ data: CommentNode[] }>(
      `/submissions/${submissionId}/comments?include=all`
    );
  }

  async createComment(
    submissionId: number,
    data: CreateCommentInput,
    turnstileToken: string,
    fingerprint: string
  ): Promise<{ data: CommentNode }> {
    return this.request<{ data: CommentNode }>(
      `/submissions/${submissionId}/comments`,
      {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "X-Turnstile-Token": turnstileToken,
          "X-Fingerprint": fingerprint,
        },
      }
    );
  }

  async voteComment(
    commentId: number,
    value: VoteValue,
    fingerprint: string
  ): Promise<{ data: CommentNode }> {
    return this.request<{ data: CommentNode }>(`/comments/${commentId}/vote`, {
      method: "POST",
      body: JSON.stringify({ value } as VoteCommentInput),
      headers: {
        "X-Fingerprint": fingerprint,
      },
    });
  }

  async deleteComment(
    commentId: number,
    fingerprint: string
  ): Promise<{ data: CommentNode }> {
    return this.request<{ data: CommentNode }>(`/comments/${commentId}`, {
      method: "DELETE",
      headers: {
        "X-Fingerprint": fingerprint,
      },
    });
  }
}

export const api = new ApiClient(API_URL);
