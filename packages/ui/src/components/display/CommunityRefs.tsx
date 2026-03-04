import { For, Show } from "solid-js";

import { ArrowUp, ExternalLink, MessageSquare } from "lucide-solid";

export interface RedditPost {
  title: string;
  url: string;
  upvotes?: number;
  date?: string;
}

export interface CommunityRefsProps {
  redditPosts?: Array<RedditPost> | null;
  sourceUrl?: string | null;
}

function formatUpvotes(count?: number): string {
  if (!count) return "";
  if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

export function CommunityRefs(props: CommunityRefsProps) {
  return (
    <div class="community-refs">
      <Show when={props.sourceUrl}>
        {(url) => (
          <a href={url()} target="_blank" rel="noopener noreferrer" class="ref-source-link">
            <ExternalLink size={16} />
            <span>Original Source</span>
          </a>
        )}
      </Show>

      <Show when={props.redditPosts && props.redditPosts!.length > 0}>
        <h4 class="community-title">Community Discussions</h4>
        <div class="ref-list">
          <For each={props.redditPosts}>
            {(post) => (
              <a href={post.url} target="_blank" rel="noopener noreferrer" class="ref-item">
                <div class="ref-item-content">
                  <MessageSquare size={16} class="ref-icon" />
                  <span class="ref-title">{post.title}</span>
                </div>
                <div class="ref-item-meta">
                  <Show when={post.upvotes}>
                    <span class="ref-upvotes">
                      <ArrowUp size={12} />
                      {formatUpvotes(post.upvotes)}
                    </span>
                  </Show>
                  <Show when={post.date}>
                    <span class="ref-date">{new Date(post.date!).toLocaleDateString()}</span>
                  </Show>
                </div>
              </a>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
