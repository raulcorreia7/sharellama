/**
 * ModelCard - Card component for displaying model information
 *
 * @description
 * Displays model metadata with stats (downloads, likes, configs).
 * Stats order: HF metadata first (downloads, likes), then platform data (configs).
 * Entire card is clickable and navigates to model detail page.
 *
 * @example
 * ```tsx
 * <ModelCard
 *   slug="meta-llama/Llama-3.2-3B"
 *   name="Llama-3.2-3B"
 *   org="meta-llama"
 *   orgAvatar="https://..."
 *   configCount={12}
 *   downloads={587000}
 *   likes={785}
 * />
 * ```
 */
import { Show } from "solid-js";

import { ChevronRight, Download, Heart, LayoutGrid } from "../icons";

export interface ModelCardProps {
  /** Model slug (e.g., "meta-llama/Llama-3.2-3B") */
  slug: string;
  /** Model name (e.g., "Llama-3.2-3B") */
  name: string;
  /** Organization name (e.g., "meta-llama") */
  org?: string | null;
  /** Organization avatar URL */
  orgAvatar?: string | null;
  /** Number of configurations submitted for this model */
  configCount: number;
  /** Download count from HuggingFace */
  downloads?: number | null;
  /** Like count from HuggingFace */
  likes?: number | null;
  /** Optional custom href (defaults to /models/[slug]) */
  href?: string;
}

export function ModelCard(props: ModelCardProps) {
  const href = () => props.href ?? `/models/${props.slug}`;

  return (
    <a href={href()} class="model-card">
      <div class="model-card-header">
        <Show when={props.orgAvatar}>
          <img
            src={props.orgAvatar ?? undefined}
            alt={props.org ?? "Organization"}
            class="model-card-org-avatar"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </Show>
        <div class="model-card-title">
          <h3 class="model-card-name">{props.name}</h3>
          <Show when={props.org && props.org !== props.name}>
            <p class="model-card-org">by {props.org}</p>
          </Show>
        </div>
      </div>

      <div class="model-card-stats">
        {/* HF Metadata first (external authority metrics) */}
        <Show when={props.downloads !== null && props.downloads !== undefined}>
          <span class="tag">
            <Download size={14} />
            {props.downloads!.toLocaleString()}
          </span>
        </Show>
        <Show when={props.likes !== null && props.likes !== undefined}>
          <span class="tag">
            <Heart size={14} />
            {props.likes!.toLocaleString()}
          </span>
        </Show>

        {/* Platform data (ShareLlama community metrics) */}
        <span class="tag">
          <LayoutGrid size={14} />
          {props.configCount} {props.configCount === 1 ? "config" : "configs"}
        </span>
      </div>

      {/* Arrow indicator - appears on hover */}
      <ChevronRight size={16} class="card-arrow" />
    </a>
  );
}
