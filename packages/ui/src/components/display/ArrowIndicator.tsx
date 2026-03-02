/**
 * ArrowIndicator - Right-aligned arrow for interactive cards
 *
 * @description
 * Displays a chevron arrow that appears/translates on card hover.
 * Used to indicate clickable/interactive cards throughout the app.
 *
 * @example
 * ```tsx
 * <Card hover glow>
 *   <CardHeader>...</CardHeader>
 *   <CardContent>...</CardContent>
 *   <ArrowIndicator />
 * </Card>
 * ```
 */
import { ChevronRight } from "../icons";

export interface ArrowIndicatorProps {
  /** Icon size in pixels (default: 16) */
  size?: number;
  /** Optional className for custom positioning */
  class?: string;
}

export function ArrowIndicator(props: ArrowIndicatorProps) {
  const size = props.size ?? 16;
  const className = props.class ?? "card-arrow";

  return <ChevronRight size={size} class={className} />;
}
