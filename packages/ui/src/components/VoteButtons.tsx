import { createSignal, createEffect, Show } from "solid-js";
import type { VoteValue } from "@sharellama/model/schemas/vote";
import { api } from "../lib/api";

interface VoteButtonsProps {
  submissionId: number;
  initialScore: number;
  initialUserVote?: VoteValue | null;
  fingerprint: string;
  size?: "normal" | "small";
}

export function VoteButtons(props: VoteButtonsProps) {
  const [score, setScore] = createSignal(props.initialScore);
  const [userVote, setUserVote] = createSignal<VoteValue | null>(props.initialUserVote ?? null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [justVoted, setJustVoted] = createSignal(false);

  createEffect(() => {
    setScore(props.initialScore);
    setUserVote(props.initialUserVote ?? null);
  });

  const handleVote = async (value: VoteValue) => {
    if (isLoading()) return;

    const prevScore = score();
    const prevUserVote = userVote();

    setIsLoading(true);
    setError(null);
    setJustVoted(true);
    setTimeout(() => setJustVoted(false), 300);

    if (prevUserVote === value) {
      const newScore = prevScore - value;
      setScore(newScore);
      setUserVote(null);
    } else if (prevUserVote === null) {
      setScore(prevScore + value);
      setUserVote(value);
    } else {
      setScore(prevScore + value * 2);
      setUserVote(value);
    }

    try {
      const result = await api.voteSubmission(props.submissionId, value, props.fingerprint);
      setScore(result.score);
      setUserVote(result.userVote);
    } catch (err) {
      setScore(prevScore);
      setUserVote(prevUserVote);
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setIsLoading(false);
    }
  };

  const buttonSize = () => (props.size === "small" ? "p-1.5" : "p-2");
  const iconSize = () => (props.size === "small" ? "h-3.5 w-3.5" : "h-4 w-4");
  const scoreSize = () =>
    props.size === "small" ? "text-sm font-medium" : "text-base font-semibold";

  return (
    <div class="flex items-center gap-1">
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={isLoading()}
        class={`${buttonSize()} rounded-md transition-all ${
          userVote() === 1
            ? "bg-[color:var(--accent-muted)] text-[color:var(--accent-text)]"
            : "text-[color:var(--text-dim)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
        } ${isLoading() ? "opacity-50 cursor-not-allowed" : ""} ${
          justVoted() && userVote() === 1 ? "pulse-once" : ""
        }`}
        aria-label="Upvote"
        aria-pressed={userVote() === 1}
      >
        <svg
          class={iconSize()}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
        </svg>
      </button>

      <span
        class={`text-mono ${scoreSize()} min-w-[2.5rem] text-center tabular-nums ${
          justVoted() ? "text-[color:var(--accent-text)]" : ""
        } transition-colors`}
      >
        {score() > 0 ? `+${score()}` : score()}
      </span>

      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={isLoading()}
        class={`${buttonSize()} rounded-md transition-all ${
          userVote() === -1
            ? "bg-red-500/15 text-red-400"
            : "text-[color:var(--text-dim)] hover:bg-[color:var(--surface-high)] hover:text-[color:var(--text)]"
        } ${isLoading() ? "opacity-50 cursor-not-allowed" : ""} ${
          justVoted() && userVote() === -1 ? "pulse-once" : ""
        }`}
        aria-label="Downvote"
        aria-pressed={userVote() === -1}
      >
        <svg
          class={iconSize()}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <Show when={error()}>
        <span class="ml-2 text-xs text-red-400">{error()}</span>
      </Show>
    </div>
  );
}
