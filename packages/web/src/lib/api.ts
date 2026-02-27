import type {
  Submission,
  SubmissionInput,
  SubmissionUpdate,
  PaginatedResponse,
  ApiError,
} from "@locallama/shared";

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
}

export const api = new ApiClient(API_URL);
