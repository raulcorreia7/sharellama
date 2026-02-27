export interface Env {
  ENVIRONMENT: string;
  TURNSTILE_SECRET_KEY: string;
  DATABASE_URL: string;
  BASE_URL?: string;
}
