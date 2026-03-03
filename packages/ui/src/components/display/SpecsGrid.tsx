/**
 * SpecsGrid - Display architecture specs in organized grid layout
 *
 * @description
 * Reusable component for displaying model architecture specifications.
 * Shows specs in a responsive grid with icons and formatted values.
 *
 * @example
 * ```tsx
 * <SpecsGrid
 *   architecture="Transformer"
 *   parameterCount="7B"
 *   layers={32}
 *   contextWindow={131072}
 *   attentionType="RoPE"
 *   multimodal={false}
 * />
 * ```
 */
import { JSX } from "solid-js";

import { Box, Cpu, Image, Layers, Type, Zap } from "lucide-solid";

export interface SpecsGridProps {
  architecture?: string | null;
  parameterCount?: string | null;
  activeParameters?: string | null;
  layers?: number | null;
  hiddenSize?: number | null;
  attentionHeads?: number | null;
  contextWindow?: number | null;
  attentionType?: string | null;
  multimodal?: boolean | null;
}

function formatContext(value?: number | null): string {
  if (!value) return "Unknown";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return String(value);
}

function SpecItem(props: {
  label: string;
  value?: string | number | null;
  icon?: JSX.Element;
  showOnlyIfValue?: boolean;
}) {
  if (props.showOnlyIfValue && !props.value) return null;

  return (
    <div class="spec-item">
      <span class="spec-item-label">
        {props.icon && <span class="spec-item-icon">{props.icon}</span>}
        {props.label}
      </span>
      <span class="spec-item-value">{props.value || "—"}</span>
    </div>
  );
}

export function SpecsGrid(props: SpecsGridProps) {
  return (
    <div class="specs-grid">
      <SpecItem label="Architecture" value={props.architecture} icon={<Box size={14} />} />
      <SpecItem label="Parameters" value={props.parameterCount} icon={<Cpu size={14} />} />
      <SpecItem label="Active Params" value={props.activeParameters} showOnlyIfValue={true} />
      <SpecItem
        label="Layers"
        value={props.layers}
        icon={<Layers size={14} />}
        showOnlyIfValue={props.layers != null}
      />
      <SpecItem
        label="Hidden Size"
        value={props.hiddenSize}
        showOnlyIfValue={props.hiddenSize != null}
      />
      <SpecItem
        label="Attention Heads"
        value={props.attentionHeads}
        showOnlyIfValue={props.attentionHeads != null}
      />
      <SpecItem
        label="Context"
        value={formatContext(props.contextWindow)}
        icon={<Type size={14} />}
      />
      <SpecItem
        label="Attention"
        value={props.attentionType}
        icon={<Zap size={14} />}
        showOnlyIfValue={props.attentionType != null}
      />
      <SpecItem
        label="Multimodal"
        value={props.multimodal ? "Yes" : "No"}
        icon={<Image size={14} />}
        showOnlyIfValue={props.multimodal !== false}
      />
    </div>
  );
}

export { formatContext };
