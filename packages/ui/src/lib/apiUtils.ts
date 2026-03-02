export type Result<T> = { ok: true; data: T } | { ok: false; error: Error };

export interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createTimeoutPromise(ms: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms);
  });
}

export async function fetchWithRetry<T>(
  url: string,
  options: FetchOptions = {},
): Promise<Result<T>> {
  const { timeout = 10000, retries = 3, retryDelay = 1000, ...fetchOptions } = options;
  const maxAttempts = retries + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await Promise.race([
        fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        }),
        createTimeoutPromise(timeout),
      ]);

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = response.statusText || `HTTP ${response.status}`;
        try {
          const errorBody = await response.json();
          if (errorBody.message) {
            errorMessage = errorBody.message;
          } else if (errorBody.error) {
            errorMessage = errorBody.error;
          }
        } catch {
          // Use status text if JSON parsing fails
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return { ok: true, data };
    } catch (error) {
      clearTimeout(timeoutId);

      const isLastAttempt = attempt === maxAttempts - 1;
      if (isLastAttempt) {
        const err = error instanceof Error ? error : new Error(String(error));
        return { ok: false, error: err };
      }

      const backoffDelay = retryDelay * Math.pow(2, attempt);
      await delay(backoffDelay);
    }
  }

  return { ok: false, error: new Error("Max retries exceeded") };
}
