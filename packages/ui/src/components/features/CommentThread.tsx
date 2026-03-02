import { createResource, createSignal, For, Show, Suspense } from "solid-js";

import type { CommentNode } from "@sharellama/model/schemas/comment";

import { api } from "../lib/api";
import { CommentItem } from "./CommentItem";
import { Turnstile } from "./Turnstile";

interface CommentThreadProps {
  submissionId: number;
  fingerprint: string;
}

type SortOption = "top" | "newest";

function sortComments(comments: CommentNode[], sortBy: SortOption): CommentNode[] {
  const sorted = [...comments];
  if (sortBy === "newest") {
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else {
    sorted.sort((a, b) => b.score - a.score);
  }
  return sorted;
}

export function CommentThread(props: CommentThreadProps) {
  const [sortBy, setSortBy] = createSignal<SortOption>("top");
  const [newCommentBody, setNewCommentBody] = createSignal("");
  const [turnstileToken, setTurnstileToken] = createSignal("");
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const refreshTrigger = createSignal(0);

  const fetchComments = async () => {
    refreshTrigger[0]();
    const result = await api.getComments(props.submissionId);
    return result.data;
  };

  const [comments, { refetch }] = createResource(fetchComments);

  const sortedComments = () => {
    const data = comments();
    if (!data) return [];
    return sortComments(data, sortBy());
  };

  const handleSubmitComment = async (e: Event) => {
    e.preventDefault();
    if (!newCommentBody().trim() || !turnstileToken()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await api.createComment(
        props.submissionId,
        { body: newCommentBody().trim() },
        turnstileToken(),
        props.fingerprint,
      );
      setNewCommentBody("");
      refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentCreated = () => {
    refetch();
  };

  const commentCount = () => {
    const countRecursive = (nodes: CommentNode[]): number => {
      return nodes.reduce((acc, node) => acc + 1 + countRecursive(node.replies ?? []), 0);
    };
    return countRecursive(comments() ?? []);
  };

  return (
    <section class="mt-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">Comments ({commentCount()})</h2>
        <Show when={comments() && comments()!.length > 0}>
          <div class="flex items-center gap-2">
            <span class="text-muted text-sm">Sort:</span>
            <select
              value={sortBy()}
              onChange={(e) => setSortBy(e.currentTarget.value as SortOption)}
              class="select px-2 py-1 text-sm"
            >
              <option value="top">Top</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </Show>
      </div>

      <form onSubmit={handleSubmitComment} class="mb-6">
        <textarea
          value={newCommentBody()}
          onInput={(e) => setNewCommentBody(e.currentTarget.value)}
          placeholder="Add a comment..."
          rows={3}
          class="textarea p-3 text-sm"
          disabled={isSubmitting()}
        />
        <div class="mt-3 flex items-center gap-4">
          <Turnstile onVerify={setTurnstileToken} />
          <button
            type="submit"
            disabled={!newCommentBody().trim() || !turnstileToken() || isSubmitting()}
            class="btn--primary px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting() ? "Posting..." : "Post Comment"}
          </button>
          <Show when={error()}>
            <span class="text-sm text-red-500">{error()}</span>
          </Show>
        </div>
      </form>

      <Suspense fallback={<div class="text-muted py-4 text-center">Loading comments...</div>}>
        <Show when={comments.error}>
          <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            Error loading comments: {comments.error?.message}
          </div>
        </Show>

        <Show when={comments() && comments()!.length === 0}>
          <p class="text-muted py-8 text-center">No comments yet. Be the first to comment!</p>
        </Show>

        <Show when={comments() && comments()!.length > 0}>
          <div class="space-y-4">
            <For each={sortedComments()}>
              {(comment) => (
                <div class="card p-4">
                  <CommentItem
                    comment={comment}
                    fingerprint={props.fingerprint}
                    submissionId={props.submissionId}
                    onCommentCreated={handleCommentCreated}
                  />
                </div>
              )}
            </For>
          </div>
        </Show>
      </Suspense>
    </section>
  );
}
