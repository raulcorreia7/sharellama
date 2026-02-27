import { createDb } from "@locallama/db";

let db: ReturnType<typeof createDb> | null = null;

export function getDb(databaseUrl: string): ReturnType<typeof createDb> {
  if (!db) {
    db = createDb(databaseUrl);
  }
  return db;
}
