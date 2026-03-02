import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://locallama:locallama@localhost:5432/locallama";

const client = postgres(connectionString);
const db = drizzle(client);

async function seed() {
  console.log("Seeding scheduled_tasks...");

  await db.execute(sql`
    INSERT INTO scheduled_tasks (name, interval_seconds, next_run, enabled)
    VALUES ('refresh_models', 43200, NOW(), true)
    ON CONFLICT (name) DO NOTHING
  `);

  console.log("✅ Seed complete");

  await client.end();
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
