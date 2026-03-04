/**
 * VramCard - Display VRAM requirements per quantization level
 *
 * @description
 * Shows hardware requirements for running a model with specific quantization.
 * Includes VRAM requirement with visual color coding and optional GPU recommendation.
 *
 * VRAM Color Coding:
 * - `vram-low`: ≤8 GB (green)
 * - `vram-medium`: 9-16 GB (yellow/orange)
 * - `vram-high`: >16 GB (red)
 *
 * @example
 * ```tsx
 * <VramCard quant="Q4_K_M" vram={8.5} recommendedGpu="RTX 3070" />
 * <VramCard quant="Q8_0" vram={24.2} recommendedGpu="RTX 3090" filesize="14.2 GB" />
 * ```
 */
import { JSX, splitProps } from "solid-js";

import { Cpu, Monitor } from "lucide-solid";

export interface VramCardProps extends JSX.HTMLAttributes<HTMLDivElement> {
  /** Quantization level (e.g., "Q4_K_M", "Q6_K", "Q8_0") */
  quant: string;
  /** VRAM requirement in GB */
  vram?: number | null;
  /** Recommended GPU model */
  recommendedGpu?: string | null;
  /** Optional file size */
  filesize?: string | null;
}

function getVramColor(vram?: number | null): string {
  if (!vram) return "";
  if (vram <= 8) return "vram-low";
  if (vram <= 16) return "vram-medium";
  return "vram-high";
}

export function VramCard(props: VramCardProps) {
  const [local, rest] = splitProps(props, [
    "quant",
    "vram",
    "recommendedGpu",
    "filesize",
    "class",
    "children",
  ]);

  const vramClass = () => getVramColor(local.vram);

  const formatVram = (vram?: number | null): string => {
    if (!vram) return "—";
    return `${vram} GB`;
  };

  return (
    <div class={`vram-card ${vramClass()} ${local.class || ""}`} {...rest}>
      <div class="vram-card-header">
        <span class="vram-quant">{local.quant}</span>
        {local.filesize && <span class="vram-size">{local.filesize}</span>}
      </div>
      <div class="vram-card-body">
        <div class="vram-requirement">
          <Monitor size={16} />
          <span class="vram-value">{formatVram(local.vram)}</span>
          <span class="vram-label">VRAM Required</span>
        </div>
        {local.recommendedGpu && (
          <div class="vram-recommended">
            <Cpu size={16} />
            <span>Recommended: {local.recommendedGpu}</span>
          </div>
        )}
      </div>
    </div>
  );
}
