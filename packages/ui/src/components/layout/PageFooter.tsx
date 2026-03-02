/**
 * PageFooter - Footer for list pages with stats and actions
 *
 * @description
 * Reusable footer component for list pages (/models, /submissions).
 * Displays collection stats on left and action buttons on right.
 *
 * @example
 * ```tsx
 * <PageFooter
 *   stats="12 models • Updated 2h ago"
 *   actions={[
 *     { label: "Refresh", onClick: handleRefresh },
 *     { label: "Import", onClick: handleImport }
 *   ]}
 * />
 * ```
 */
import { For, Show } from "solid-js";

import { Button } from "../display/Button";

export interface PageFooterAction {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
}

export interface PageFooterProps {
  /** Stats text to display (e.g., "12 models • Updated 2h ago") */
  stats: string;
  /** Optional action buttons */
  actions?: PageFooterAction[];
  /** Optional className for custom styling */
  class?: string;
}

export function PageFooter(props: PageFooterProps) {
  return (
    <div class={`page-footer ${props.class ?? ""}`}>
      <div class="page-footer-inner">
        <span class="page-footer-stats text-muted">{props.stats}</span>
        <Show when={props.actions && props.actions.length > 0}>
          <div class="page-footer-actions">
            <For each={props.actions}>
              {(action) => (
                <Button
                  type="button"
                  onClick={action.onClick}
                  variant={action.variant ?? "ghost"}
                  size="sm"
                  disabled={action.disabled}
                >
                  {action.label}
                </Button>
              )}
            </For>
          </div>
        </Show>
      </div>
    </div>
  );
}
