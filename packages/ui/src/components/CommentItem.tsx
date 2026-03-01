import { Show, createSignal, createEffect } from "solid-js";
import type { CommentNode } from "@sharellama/model/schemas/comment";
import type { VoteValue } from "@sharellama/model/schemas/vote";
import { api } from "../lib/api";
import { Turnstile } from "./Turnstile";

interface CommentItemProps {
  comment: CommentNode;
  fingerprint: string;
  submissionId: number;
  onReply?: (comment: CommentNode) => void;
  onCommentCreated?: () => void;
  depth?: number;
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

export function CommentItem(props: CommentItemProps) {
  const depth = () => props.depth ?? 0;
  const [score, setScore] = createSignal(props.comment.score);
  const [userVote, setUserVote] = createSignal<VoteValue | null>(null);
  const [isLoading, setIsLoading] = createSignal(false);
  const [showReplyForm, setShowReplyForm] = createSignal(false);
  const [replyBody, setReplyBody] = createSignal("");
  const [turnstileToken, setTurnstileToken] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    setScore(props.comment.score);
  });

  const handleVote = async (value: VoteValue) => {
    if (isLoading()) return;

    const prevScore = score();
    const prevUserVote = userVote();

    setIsLoading(true);
    setError(null);

    if (prevUserVote === value) {
      setScore(prevScore - value);
      setUserVote(null);
    } else if (prevUserVote === null) {
      setScore(prevScore + value);
      setUserVote(value);
    } else {
      setScore(prevScore + value * 2);
      setUserVote(value);
    }

    try {
      const result = await api.voteComment(props.comment.id, value, props.fingerprint);
      setScore(result.data.score);
    } catch (err) {
      setScore(prevScore);
      setUserVote(prevUserVote);
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitReply = async (e: Event) => {
    e.preventDefault();
    if (!replyBody().trim() || !turnstileToken()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.createComment(
        props.submissionId,
        { body: replyBody().trim(), parentId: props.comment.id },
        turnstileToken(),
        props.fingerprint,
      );
      setReplyBody("");
      setShowReplyForm(false);
      props.onCommentCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post reply");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDeleted = () => props.comment.body === "[deleted]";
  const maxDepth = 6;

  return (
    <article class="flex gap-2">
      <Show when={depth() < maxDepth}>
        <div class="shrink-0 w-1 rounded bg-[#274b78]" />
      </Show>
      <div class="flex-1 min-w-0">
        <header class="ll-muted mb-1 flex items-center gap-2 text-xs">
          <span class="font-mono font-medium">{props.comment.authorHash}</span>
          <span>•</span>
          <time datetime={props.comment.createdAt}>{timeAgo(props.comment.createdAt)}</time>
        </header>

        <p class={`mb-2 text-sm ${isDeleted() ? "ll-muted italic" : ""}`}>{props.comment.body}</p>

        <div class="flex items-center gap-3 mb-2">
          <div class="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => handleVote(1)}
              disabled={isLoading()}
              class={`p-0.5 rounded text-xs transition-colors ${
                userVote() === 1
                  ? "bg-[#173764] text-[#dbeafe]"
                  : "ll-muted hover:text-[color:var(--text)]"
              }`}
              aria-label="Upvote"
            >
              ▲
            </button>
            <span class="ll-muted min-w-[1.5rem] text-center text-xs">{score()}</span>
            <button
              type="button"
              onClick={() => handleVote(-1)}
              disabled={isLoading()}
              class={`p-0.5 rounded text-xs transition-colors ${
                userVote() === -1
                  ? "bg-[#173764] text-[#dbeafe]"
                  : "ll-muted hover:text-[color:var(--text)]"
              }`}
              aria-label="Downvote"
            >
              ▼
            </button>
          </div>

          <Show when={!isDeleted()}>
            <button
              type="button"
              onClick={() => setShowReplyForm(!showReplyForm())}
              class="ll-muted text-xs hover:text-[color:var(--text)]"
            >
              {showReplyForm() ? "Cancel" : "Reply"}
            </button>
          </Show>

          <Show when={error()}>
            <span class="text-xs text-red-500">{error()}</span>
          </Show>
        </div>

        <Show when={showReplyForm()}>
          <form onSubmit={handleSubmitReply} class="mb-3">
            <textarea
              value={replyBody()}
              onInput={(e) => setReplyBody(e.currentTarget.value)}
              placeholder="Write a reply..."
              rows={2}
              class="ll-textarea p-2 text-sm"
              disabled={isSubmitting()}
            />
            <div class="mt-2 flex items-center gap-3">
              <Turnstile onVerify={setTurnstileToken} size="compact" class="shrink-0" />
              <button
                type="submit"
                disabled={!replyBody().trim() || !turnstileToken() || isSubmitting()}
                class="ll-btn-primary px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting() ? "Posting..." : "Reply"}
              </button>
            </div>
          </form>
        </Show>

        <Show when={props.comment.replies && props.comment.replies!.length > 0}>
          <div class="space-y-3">
            {props.comment.replies!.map((reply) => (
              <CommentItem
                comment={reply}
                fingerprint={props.fingerprint}
                submissionId={props.submissionId}
                onCommentCreated={props.onCommentCreated}
                depth={depth() + 1}
              />
            ))}
          </div>
        </Show>
      </div>
    </article>
  );
}
