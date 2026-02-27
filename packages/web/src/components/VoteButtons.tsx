import { createSignal, createEffect, Show } from "solid-js";
import type { VoteValue } from "@locallama/shared/schemas/vote";
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
  const [userVote, setUserVote] = createSignal<VoteValue | null>(
    props.initialUserVote ?? null
  );
  const [isLoading, setIsLoading] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

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
      const result = await api.voteSubmission(
        props.submissionId,
        value,
        props.fingerprint
      );
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

  const buttonSize = () => (props.size === "small" ? "p-1 text-sm" : "p-2");
  const scoreSize = () =>
    props.size === "small" ? "text-sm" : "text-base font-medium";

  return (
    <div class="flex items-center gap-1">
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={isLoading()}
        class={`${buttonSize()} rounded transition-colors ${
          userVote() === 1
            ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
            : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        } ${isLoading() ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label="Upvote"
        aria-pressed={userVote() === 1}
      >
        ▲
      </button>
      <span class={`${scoreSize()} min-w-[2rem] text-center text-gray-700 dark:text-gray-300`}>
        {score()}
      </span>
      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={isLoading()}
        class={`${buttonSize()} rounded transition-colors ${
          userVote() === -1
            ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
            : "text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
        } ${isLoading() ? "opacity-50 cursor-not-allowed" : ""}`}
        aria-label="Downvote"
        aria-pressed={userVote() === -1}
      >
        ▼
      </button>
      <Show when={error()}>
        <span class="ml-2 text-xs text-red-500">{error()}</span>
      </Show>
    </div>
  );
}
