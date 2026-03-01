import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  real,
  smallint,
  timestamp,
  jsonb,
  unique,
} from "drizzle-orm/pg-core";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  authorHash: varchar("author_hash", { length: 64 }).notNull(),
  editToken: varchar("edit_token", { length: 32 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  cpu: varchar("cpu", { length: 200 }),
  gpu: varchar("gpu", { length: 200 }),
  ramGb: integer("ram_gb"),
  runtime: varchar("runtime", { length: 50 }).notNull(),
  runtimeVersion: varchar("runtime_version", { length: 50 }),
  modelName: varchar("model_name", { length: 100 }).notNull(),
  quantization: varchar("quantization", { length: 50 }),
  contextLength: integer("context_length"),
  command: text("command"),
  inferenceParams: jsonb("inference_params").$type<Record<string, unknown>>(),
  temperature: real("temperature"),
  topP: real("top_p"),
  topK: integer("top_k"),
  minP: real("min_p"),
  repeatPenalty: real("repeat_penalty"),
  mirostat: smallint("mirostat"),
  mirostatTau: real("mirostat_tau"),
  mirostatEta: real("mirostat_eta"),
  seed: integer("seed"),
  tokensPerSecond: real("tokens_per_second"),
  latencyMs: integer("latency_ms"),
  memoryMb: integer("memory_mb"),
  tags: jsonb("tags").$type<string[]>().default([]),
  score: integer("score").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const votes = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    voterHash: varchar("voter_hash", { length: 64 }).notNull(),
    submissionId: integer("submission_id")
      .references(() => submissions.id)
      .notNull(),
    value: smallint("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    voterSubmissionUnique: unique().on(table.voterHash, table.submissionId),
  }),
);

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  submissionId: integer("submission_id")
    .references(() => submissions.id)
    .notNull(),
  authorHash: varchar("author_hash", { length: 64 }).notNull(),
  parentId: integer("parent_id").references((): AnyPgColumn => comments.id),
  body: text("body").notNull(),
  score: integer("score").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commentVotes = pgTable(
  "comment_votes",
  {
    id: serial("id").primaryKey(),
    voterHash: varchar("voter_hash", { length: 64 }).notNull(),
    commentId: integer("comment_id")
      .references(() => comments.id)
      .notNull(),
    value: smallint("value").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    voterCommentUnique: unique().on(table.voterHash, table.commentId),
  }),
);

export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl);
  return drizzle(client, { schema: { submissions, votes, comments, commentVotes } });
}

export type Db = ReturnType<typeof createDb>;
