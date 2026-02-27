import initSqlJs from "sql.js";
import { drizzle } from "drizzle-orm/sql-js";
import { integer, sqliteTable, text, real } from "drizzle-orm/sqlite-core";
import { eq, and, desc, asc, sql as drizzleSql } from "drizzle-orm";

export const submissions = sqliteTable("submissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  authorHash: text("author_hash").notNull(),
  editToken: text("edit_token").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  cpu: text("cpu"),
  gpu: text("gpu"),
  ramGb: integer("ram_gb"),
  runtime: text("runtime").notNull(),
  runtimeVersion: text("runtime_version"),
  modelName: text("model_name").notNull(),
  quantization: text("quantization"),
  contextLength: integer("context_length"),
  command: text("command"),
  inferenceParams: text("inference_params", { mode: "json" }),
  temperature: real("temperature"),
  topP: real("top_p"),
  topK: integer("top_k"),
  minP: real("min_p"),
  repeatPenalty: real("repeat_penalty"),
  mirostat: integer("mirostat"),
  mirostatTau: real("mirostat_tau"),
  mirostatEta: real("mirostat_eta"),
  seed: integer("seed"),
  tokensPerSecond: real("tokens_per_second"),
  latencyMs: integer("latency_ms"),
  memoryMb: integer("memory_mb"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  score: integer("score").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(drizzleSql`(unixepoch())`).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(drizzleSql`(unixepoch())`).notNull(),
});

export const votes = sqliteTable("votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  voterHash: text("voter_hash").notNull(),
  submissionId: integer("submission_id").references(() => submissions.id).notNull(),
  value: integer("value").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(drizzleSql`(unixepoch())`).notNull(),
});

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  submissionId: integer("submission_id").references(() => submissions.id).notNull(),
  authorHash: text("author_hash").notNull(),
  parentId: integer("parent_id").references((): ReturnType<typeof sqliteTable>["id"] => comments.id),
  body: text("body").notNull(),
  score: integer("score").default(0).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(drizzleSql`(unixepoch())`).notNull(),
});

export const commentVotes = sqliteTable("comment_votes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  voterHash: text("voter_hash").notNull(),
  commentId: integer("comment_id").references(() => comments.id).notNull(),
  value: integer("value").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(drizzleSql`(unixepoch())`).notNull(),
});

export type TestDb = Awaited<ReturnType<typeof createTestDb>>;

export async function createTestDb() {
  const SQL = await initSqlJs();
  const sqlite = new SQL.Database();
  const db = drizzle(sqlite, { schema: { submissions, votes, comments, commentVotes } });

  sqlite.run(`
    CREATE TABLE submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      author_hash TEXT NOT NULL,
      edit_token TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      cpu TEXT,
      gpu TEXT,
      ram_gb INTEGER,
      runtime TEXT NOT NULL,
      runtime_version TEXT,
      model_name TEXT NOT NULL,
      quantization TEXT,
      context_length INTEGER,
      command TEXT,
      inference_params TEXT,
      temperature REAL,
      top_p REAL,
      top_k INTEGER,
      min_p REAL,
      repeat_penalty REAL,
      mirostat INTEGER,
      mirostat_tau REAL,
      mirostat_eta REAL,
      seed INTEGER,
      tokens_per_second REAL,
      latency_ms INTEGER,
      memory_mb INTEGER,
      tags TEXT,
      score INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voter_hash TEXT NOT NULL,
      submission_id INTEGER NOT NULL REFERENCES submissions(id),
      value INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(voter_hash, submission_id)
    );

    CREATE TABLE comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      submission_id INTEGER NOT NULL REFERENCES submissions(id),
      author_hash TEXT NOT NULL,
      parent_id INTEGER REFERENCES comments(id),
      body TEXT NOT NULL,
      score INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE comment_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voter_hash TEXT NOT NULL,
      comment_id INTEGER NOT NULL REFERENCES comments(id),
      value INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(voter_hash, comment_id)
    );
  `);

  return {
    db,
    sqlite,
    submissions,
    votes,
    comments,
    commentVotes,
    eq,
    and,
    desc,
    asc,
    sql: drizzleSql,
  };
}

export function createMockEnv(overrides?: Partial<Record<string, string>>) {
  return {
    ENVIRONMENT: "test",
    TURNSTILE_SECRET_KEY: "test-secret",
    DATABASE_URL: ":memory:",
    BASE_URL: "http://localhost:3000",
    ...overrides,
  };
}
