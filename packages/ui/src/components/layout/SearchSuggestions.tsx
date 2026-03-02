import { createResource, For, Show } from "solid-js";

import {
  formatDownloads,
  formatModelName,
  getTrendingModels,
  type HFModel,
} from "../lib/huggingface";
import { Download, ExternalLink, Heart } from "./icons";

interface SearchSuggestionsProps {
  onSelect: (model: string) => void;
  onClose: () => void;
}

export function SearchSuggestions(props: SearchSuggestionsProps) {
  const [models] = createResource(() => getTrendingModels(5));

  const handleClick = (model: HFModel) => {
    props.onSelect(formatModelName(model.id));
    props.onClose();
  };

  return (
    <div class="search-suggestions">
      <div class="search-suggestions-header">
        <span class="search-suggestions-title">Trending on Hugging Face</span>
        <a
          href="https://huggingface.co/models?sort=trending"
          target="_blank"
          rel="noopener noreferrer"
          class="search-suggestions-link"
        >
          View all
          <ExternalLink size={12} />
        </a>
      </div>
      <Show when={models.loading}>
        <div class="search-suggestions-loading">Loading...</div>
      </Show>
      <Show when={models.error}>
        <div class="search-suggestions-error">Unable to load</div>
      </Show>
      <Show when={models()}>
        <ul>
          <For each={models()}>
            {(model) => (
              <li>
                <button
                  type="button"
                  onClick={() => handleClick(model)}
                  class="search-suggestions-item"
                >
                  <span class="search-suggestions-item-name">{formatModelName(model.id)}</span>
                  <span class="search-suggestions-item-stats">
                    <span class="search-suggestions-item-stat">
                      <Download size={12} />
                      {formatDownloads(model.downloads)}
                    </span>
                    <span class="search-suggestions-item-stat">
                      <Heart size={12} />
                      {formatDownloads(model.likes)}
                    </span>
                  </span>
                </button>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </div>
  );
}
