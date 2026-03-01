import { createDb, type Db } from "@sharellama/database";

export function getDb(databaseUrl: string): Db {
  return createDb(databaseUrl);
}
