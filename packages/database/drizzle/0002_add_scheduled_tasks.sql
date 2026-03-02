CREATE TABLE "scheduled_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"interval_seconds" integer NOT NULL,
	"last_run" timestamp,
	"next_run" timestamp NOT NULL,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "scheduled_tasks_name_unique" UNIQUE("name")
);
