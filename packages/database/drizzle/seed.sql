INSERT INTO scheduled_tasks (name, interval_seconds, next_run, enabled)
VALUES ('refresh_models', 43200, NOW(), true)
ON CONFLICT (name) DO NOTHING;
