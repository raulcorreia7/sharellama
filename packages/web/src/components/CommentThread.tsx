import {
  createResource,
  createSignal,
  Show,
  For,
  Suspense,
} from "solid-js";
import type { CommentNode } from "@locallama/shared/schemas/comment";
import { api } from "../lib/api";
import { Turnstile } from "./Turnstile";
import { CommentItem } from "./CommentItem";

interface CommentThreadProps {
  submissionId: number;
  fingerprint: string;
}

type SortOption = "top" | "newest";

function sortComments(comments: CommentNode[], sortBy: SortOption): CommentNode[] {
  const sorted = [...comments];
  if (sortBy === "newest") {
    sorted.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
  let refreshTrigger = createSignal(0);

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
        props.fingerprint
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
      return nodes.reduce(
        (acc, node) => acc + 1 + countRecursive(node.replies ?? []),
        0
      );
    };
    return countRecursive(comments() ?? []);
  };

  return (
    <section class="mt-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
          Comments ({commentCount()})
        </h2>
        <Show when={comments() && comments()!.length > 0}>
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500 dark:text-gray-400">Sort:</span>
            <select
              value={sortBy()}
              onChange={(e) => setSortBy(e.currentTarget.value as SortOption)}
              class="rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
          class="w-full rounded border border-gray-300 p-3 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          disabled={isSubmitting()}
        />
        <div class="mt-3 flex items-center gap-4">
          <Turnstile onVerify={setTurnstileToken} />
          <button
            type="submit"
            disabled={!newCommentBody().trim() || !turnstileToken() || isSubmitting()}
            class="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isSubmitting() ? "Posting..." : "Post Comment"}
          </button>
          <Show when={error()}>
            <span class="text-sm text-red-500">{error()}</span>
          </Show>
        </div>
      </form>

      <Suspense fallback={<div class="py-4 text-center text-gray-500">Loading comments...</div>}>
        <Show when={comments.error}>
          <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            Error loading comments: {comments.error?.message}
          </div>
        </Show>

        <Show when={comments() && comments()!.length === 0}>
          <p class="py-8 text-center text-gray-500 dark:text-gray-400">
            No comments yet. Be the first to comment!
          </p>
        </Show>

        <Show when={comments() && comments()!.length > 0}>
          <div class="space-y-4">
            <For each={sortedComments()}>
              {(comment) => (
                <div class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
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
