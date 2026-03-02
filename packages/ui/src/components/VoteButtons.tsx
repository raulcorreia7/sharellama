import { createSignal, createEffect, Show } from "solid-js";
import { ChevronUp, ChevronDown } from "./icons";
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

  const iconSize = () => (props.size === "small" ? 14 : 16);

  return (
    <div class="vote">
      <button
        type="button"
        onClick={() => handleVote(1)}
        disabled={isLoading()}
        classList={{
          "vote-btn": true,
          "vote-btn--sm": props.size === "small",
          "vote-btn--upvoted": userVote() === 1,
          "vote-btn--neutral": userVote() !== 1,
          "vote-btn--disabled": isLoading(),
          "pulse-once": justVoted() && userVote() === 1,
        }}
        aria-label="Upvote"
        aria-pressed={userVote() === 1}
      >
        <ChevronUp size={iconSize()} />
      </button>

      <span
        classList={{
          "vote-score": true,
          "vote-score--sm": props.size === "small",
          "text-[color:var(--accent-text)]": justVoted(),
        }}
      >
        {score() > 0 ? `+${score()}` : score()}
      </span>

      <button
        type="button"
        onClick={() => handleVote(-1)}
        disabled={isLoading()}
        classList={{
          "vote-btn": true,
          "vote-btn--sm": props.size === "small",
          "vote-btn--downvoted": userVote() === -1,
          "vote-btn--neutral": userVote() !== -1,
          "vote-btn--disabled": isLoading(),
          "pulse-once": justVoted() && userVote() === -1,
        }}
        aria-label="Downvote"
        aria-pressed={userVote() === -1}
      >
        <ChevronDown size={iconSize()} />
      </button>

      <Show when={error()}>
        <span class="vote-error">{error()}</span>
      </Show>
    </div>
  );
}
