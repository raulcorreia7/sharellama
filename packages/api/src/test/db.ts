import { createDb, submissions, votes, comments, commentVotes, type Db } from "@sharellama/database";
import { eq, and, desc, asc, sql } from "drizzle-orm";

export { submissions, votes, comments, commentVotes };
export { eq, and, desc, asc, sql };

export type TestDb = Db;

export async function createTestDb() {
  const testDbUrl =
    process.env.TEST_DATABASE_URL ?? "postgres://locallama:locallama@localhost:5432/locallama_test";
  const db = createDb(testDbUrl);

  await db.execute(sql`TRUNCATE TABLE comment_votes, comments, votes, submissions CASCADE`);

  return {
    db,
    submissions,
    votes,
    comments,
    commentVotes,
    eq,
    and,
    desc,
    asc,
    sql,
  };
}

export function createMockEnv(overrides?: Partial<Record<string, string>>) {
  return {
    ENVIRONMENT: "test",
    TURNSTILE_SECRET_KEY: "test-secret",
    DATABASE_URL:
      process.env.TEST_DATABASE_URL ??
      "postgres://locallama:locallama@localhost:5432/locallama_test",
    BASE_URL: "http://localhost:3000",
    ...overrides,
  };
}
