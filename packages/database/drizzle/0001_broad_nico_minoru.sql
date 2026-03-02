CREATE TABLE "hf_cache" (
	"key" varchar(100) PRIMARY KEY NOT NULL,
	"data" jsonb NOT NULL,
	"fetched_at" timestamp DEFAULT now() NOT NULL
);
