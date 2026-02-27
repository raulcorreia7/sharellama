import { A } from "@solidjs/router";
import type { Submission } from "@locallama/shared";

interface SubmissionCardProps {
  submission: Submission;
}

function timeAgo(date: string): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function SubmissionCard(props: SubmissionCardProps) {
  const s = () => props.submission;

  return (
    <article class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      <div class="mb-2 flex items-start justify-between">
        <A
          href={`/submissions/${s().id}`}
          class="text-lg font-semibold text-gray-900 hover:underline dark:text-white"
        >
          {s().title}
        </A>
        <span class="ml-2 shrink-0 rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          {s().runtime}
        </span>
      </div>

      <p class="mb-3 text-sm text-gray-600 dark:text-gray-400">
        {s().modelName}
        {s().quantization && (
          <span class="ml-1 text-gray-400">({s().quantization})</span>
        )}
      </p>

      <div class="mb-3 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
        {s().tokensPerSecond != null && (
          <span class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-700">
            {s().tokensPerSecond!.toFixed(1)} tok/s
          </span>
        )}
        {s().gpu && (
          <span class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-700">
            {s().gpu}
          </span>
        )}
        {s().cpu && !s().gpu && (
          <span class="rounded bg-gray-100 px-2 py-1 dark:bg-gray-700">
            {s().cpu}
          </span>
        )}
      </div>

      <div class="flex items-center justify-between text-sm">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Upvote"
          >
            ▲
          </button>
          <span class="font-medium text-gray-700 dark:text-gray-300">
            {s().score}
          </span>
          <button
            type="button"
            class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            aria-label="Downvote"
          >
            ▼
          </button>
        </div>
        <time class="text-xs text-gray-400" datetime={s().createdAt}>
          {timeAgo(s().createdAt)}
        </time>
      </div>
    </article>
  );
}
