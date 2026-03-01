import { A } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import type { Submission } from "@sharellama/model";
import { generateFingerprint } from "../lib/fingerprint";
import { VoteButtons } from "./VoteButtons";

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
  const [fingerprint, setFingerprint] = createSignal("");

  onMount(async () => {
    const fp = await generateFingerprint();
    setFingerprint(fp);
  });

  return (
    <article class="ll-card ll-card-hover ll-card-glow p-4">
      <div class="mb-2 flex items-start justify-between gap-2">
        <A
          href={`/submissions/${s().id}`}
          class="text-display text-lg font-semibold transition-colors hover:text-[color:var(--accent-text)]"
        >
          {s().title}
        </A>
        <span class="ll-chip shrink-0 text-xs">{s().runtime}</span>
      </div>

      <p class="text-muted mb-3 text-sm">
        <span class="font-medium">{s().modelName}</span>
        {s().quantization && (
          <span class="ll-chip-neutral ml-2 px-2 py-0.5 text-xs">{s().quantization}</span>
        )}
      </p>

      <div class="mb-3 flex flex-wrap gap-2">
        {s().tokensPerSecond != null && (
          <span class="text-mono text-sm font-medium text-[color:var(--accent-text)]">
            {s().tokensPerSecond!.toFixed(1)} tok/s
          </span>
        )}
        {s().gpu && <span class="ll-chip-neutral text-xs">{s().gpu}</span>}
        {s().cpu && !s().gpu && <span class="ll-chip-neutral text-xs">{s().cpu}</span>}
      </div>

      <div class="flex items-center justify-between">
        <Show when={fingerprint()} fallback={<span class="ll-muted">...</span>}>
          <VoteButtons
            submissionId={s().id}
            initialScore={s().score}
            fingerprint={fingerprint()}
            size="small"
          />
        </Show>
        <time class="text-xs text-[color:var(--text-dim)]" datetime={s().createdAt}>
          {timeAgo(s().createdAt)}
        </time>
      </div>
    </article>
  );
}
