import {
  createDb,
  submissions,
  votes,
  comments,
  commentVotes,
  models,
  type Db,
} from "@sharellama/database";
import { eq, and, desc, asc, sql } from "drizzle-orm";
import { createServerConfig, type Config } from "@sharellama/model/config";

export { submissions, votes, comments, commentVotes, models };
export { eq, and, desc, asc, sql };

export type TestDb = Db;

export function getTestDatabaseUrl(): string {
  return (
    process.env.TEST_DATABASE_URL ?? "postgres://locallama:locallama@localhost:5432/locallama_test"
  );
}

export async function createTestDb() {
  const testDbUrl = getTestDatabaseUrl();
  const db = createDb(testDbUrl);

  await db.execute(sql`TRUNCATE TABLE comment_votes, comments, votes, submissions, models CASCADE`);

  return {
    db,
    submissions,
    votes,
    comments,
    commentVotes,
    models,
    eq,
    and,
    desc,
    asc,
    sql,
  };
}

export function createMockEnv(overrides?: Partial<Record<string, string>>): Record<string, string> {
  const testDbUrl = getTestDatabaseUrl();
  return {
    ENVIRONMENT: "test",
    AUTH_TURNSTILE_SECRET_KEY: "test-secret",
    DATABASE_URL: testDbUrl,
    TEST_DATABASE_URL: testDbUrl,
    UI_API_URL: "http://localhost:8787",
    UI_BASE_URL: "http://localhost:3000",
    ...overrides,
  };
}

export function createTestConfig(overrides?: Partial<Record<string, string>>): Config {
  return createServerConfig(createMockEnv(overrides));
}
