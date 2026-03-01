import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://locallama:locallama@localhost:5432/locallama",
  },
});
