import { eq } from "drizzle-orm";
import { models, scheduledTasks } from "@sharellama/database";
import type { Db } from "@sharellama/database";

const HF_API = "https://huggingface.co/api";
const SUPPORTED_PIPELINES = [
  "text-generation",
  "text2text-generation",
  "image-text-to-text",
  "conversational",
];

interface HFModel {
  id: string;
  modelId: string;
  author: string;
  downloads: number;
  likes: number;
  pipeline_tag: string | null;
  library_name: string | null;
  tags: string[];
}

export interface TaskResult {
  success: boolean;
  error?: string;
  stats?: Record<string, number | string>;
}

export type TaskHandler = (db: Db, env: Record<string, string | undefined>) => Promise<TaskResult>;

const taskRegistry = new Map<string, TaskHandler>();
const runningTasks = new Set<string>();
let lastTaskCheck = 0;
const TASK_CHECK_DEBOUNCE_MS = 60 * 1000;

export function registerTask(name: string, handler: TaskHandler): void {
  taskRegistry.set(name, handler);
}

async function fetchWithTimeout<T>(url: string, timeout = 10000): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    return await response.json();
  } catch {
    return null;
  }
}

async function refreshModelsTask(
  db: Db,
  _env: Record<string, string | undefined>,
): Promise<TaskResult> {
  try {
    const params = new URLSearchParams({
      filter: SUPPORTED_PIPELINES.join(","),
      limit: "100",
      sort: "downloads",
      direction: "-1",
    });

    const data = await fetchWithTimeout<HFModel[]>(`${HF_API}/models?${params}`, 30000);

    if (!data) {
      return { success: false, error: "Failed to fetch models from HuggingFace API" };
    }

    let added = 0;
    let updated = 0;

    for (const hfModel of data) {
      const slug = hfModel.id;
      const parts = slug.split("/");
      const name = (parts.length > 1 ? parts[1] : parts[0]) || slug;
      const org = parts.length > 1 ? parts[0] || null : null;

      const existing = await db.select().from(models).where(eq(models.slug, slug)).limit(1);

      if (existing.length === 0) {
        await db.insert(models).values({
          slug,
          name,
          org,
          configCount: 0,
        });
        added++;
      } else {
        updated++;
      }
    }

    return { success: true, stats: { added, updated, total: data.length } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  }
}

registerTask("refresh_models", refreshModelsTask);

export async function checkAndRunTasks(
  db: Db,
  env: Record<string, string | undefined>,
): Promise<void> {
  const now = Date.now();

  if (now - lastTaskCheck < TASK_CHECK_DEBOUNCE_MS) {
    return;
  }
  lastTaskCheck = now;

  try {
    const tasks = await db.select().from(scheduledTasks).where(eq(scheduledTasks.enabled, true));

    for (const task of tasks) {
      if (runningTasks.has(task.name)) {
        continue;
      }

      const nextRun = task.nextRun ? new Date(task.nextRun).getTime() : 0;
      if (nextRun > now) {
        continue;
      }

      const handler = taskRegistry.get(task.name);
      if (!handler) {
        console.warn(`No handler registered for task: ${task.name}`);
        continue;
      }

      runningTasks.add(task.name);

      (async () => {
        try {
          const result = await handler(db, env);

          const nextRunTime = new Date(now + task.intervalSeconds * 1000);

          await db
            .update(scheduledTasks)
            .set({
              lastRun: new Date(),
              nextRun: nextRunTime,
              lastError: result.success ? null : (result.error ?? null),
            })
            .where(eq(scheduledTasks.name, task.name));

          if (result.success) {
            console.log(`Task ${task.name} completed:`, result.stats);
          } else {
            console.error(`Task ${task.name} failed:`, result.error);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          console.error(`Task ${task.name} threw error:`, message);

          await db
            .update(scheduledTasks)
            .set({
              lastRun: new Date(),
              lastError: message,
            })
            .where(eq(scheduledTasks.name, task.name));
        } finally {
          runningTasks.delete(task.name);
        }
      })().catch((err) => {
        console.error(`Unhandled error in task ${task.name}:`, err);
        runningTasks.delete(task.name);
      });
    }
  } catch (error) {
    console.error("Error checking tasks:", error);
  }
}

export async function runTaskNow(
  db: Db,
  env: Record<string, string | undefined>,
  taskName: string,
): Promise<TaskResult> {
  const handler = taskRegistry.get(taskName);
  if (!handler) {
    return { success: false, error: `No handler registered for task: ${taskName}` };
  }

  if (runningTasks.has(taskName)) {
    return { success: false, error: "Task is already running" };
  }

  runningTasks.add(taskName);

  try {
    const result = await handler(db, env);

    const now = Date.now();
    const task = await db
      .select()
      .from(scheduledTasks)
      .where(eq(scheduledTasks.name, taskName))
      .limit(1);

    if (task[0]) {
      const nextRunTime = new Date(now + task[0].intervalSeconds * 1000);

      await db
        .update(scheduledTasks)
        .set({
          lastRun: new Date(),
          nextRun: nextRunTime,
          lastError: result.success ? null : (result.error ?? null),
        })
        .where(eq(scheduledTasks.name, taskName));
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: message };
  } finally {
    runningTasks.delete(taskName);
  }
}

export function getRunningTasks(): string[] {
  return Array.from(runningTasks);
}

export { taskRegistry };
