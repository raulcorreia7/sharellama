import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  smallint,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export const models = pgTable(
  "models",
  {
    slug: varchar("slug", { length: 255 }).primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    org: varchar("org", { length: 200 }),
    orgAvatar: varchar("org_avatar", { length: 500 }),
    configCount: integer("config_count").default(0).notNull(),
    lastValidated: timestamp("last_validated"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index().on(table.org),
    configCountIdx: index().on(table.configCount),
  }),
);

export const submissions = pgTable(
  "submissions",
  {
    id: serial("id").primaryKey(),
    authorHash: varchar("author_hash", { length: 64 }).notNull(),
    editToken: varchar("edit_token", { length: 32 }).notNull(),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    cpu: varchar("cpu", { length: 200 }),
    gpu: varchar("gpu", { length: 200 }),
    ramGb: integer("ram_gb"),
    vramGb: integer("vram_gb"),
    runtime: varchar("runtime", { length: 50 }).notNull(),
    runtimeVersion: varchar("runtime_version", { length: 50 }),
    modelSlug: varchar("model_slug", { length: 255 })
      .references(() => models.slug)
      .notNull(),
    quantization: varchar("quantization", { length: 50 }),
    quantSource: varchar("quant_source", { length: 200 }),
    quantUrl: varchar("quant_url", { length: 500 }),
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
  },
  (table) => ({
    modelSlugIdx: index().on(table.modelSlug),
    gpuIdx: index().on(table.gpu),
    tokensPerSecondIdx: index().on(table.tokensPerSecond),
    scoreIdx: index().on(table.score),
    createdAtIndex: index().on(table.createdAt),
  }),
);

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

export const hfCache = pgTable("hf_cache", {
  key: varchar("key", { length: 100 }).primaryKey(),
  data: jsonb("data").notNull(),
  fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
});

export const orgAvatars = pgTable(
  "org_avatars",
  {
    org: varchar("org", { length: 100 }).primaryKey(),
    avatarUrl: varchar("avatar_url", { length: 500 }).notNull(),
    fetchedAt: timestamp("fetched_at").defaultNow().notNull(),
  },
  (table) => ({
    orgIdx: index().on(table.org),
  }),
);

export const scheduledTasks = pgTable("scheduled_tasks", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).unique().notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  intervalSeconds: integer("interval_seconds").notNull(),
  lastRun: timestamp("last_run"),
  nextRun: timestamp("next_run").notNull(),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export function createDb(databaseUrl: string) {
  const client = postgres(databaseUrl);
  return drizzle(client, {
    schema: {
      models,
      submissions,
      votes,
      comments,
      commentVotes,
      hfCache,
      scheduledTasks,
      orgAvatars,
    },
  });
}

export type Db = ReturnType<typeof createDb>;

export * from "./helpers";
