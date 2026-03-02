/**
 * Card - Container component for content cards
 *
 * @description
 * Reusable card container with optional hover, glow, and interactive states.
 * Use as a wrapper for card-based content throughout the app.
 *
 * Glow Variants:
 * - `glow`: Base intensity (default) - subtle blue glow on hover
 * - `glow-emphasis`: Featured content - stronger glow effect
 * - `glow-strong`: CTA/critical content - most prominent glow
 *
 * @example
 * ```tsx
 * // Basic card
 * <Card>...</Card>
 *
 * // Interactive card with hover and glow
 * <Card hover glow>...</Card>
 *
 * // Featured card with emphasis glow
 * <Card hover glow="emphasis">...</Card>
 * ```
 */
import { JSX, splitProps } from "solid-js";

export interface CardProps extends JSX.HTMLAttributes<HTMLElement> {
  /** Enable hover state (border color change) */
  hover?: boolean;
  /** Enable interactive state (cursor pointer, transform) */
  interactive?: boolean;
  /** Enable glow effect on hover (default, emphasis, or strong) */
  glow?: boolean | "default" | "emphasis" | "strong";
}

export function Card(props: CardProps) {
  const [local, rest] = splitProps(props, ["hover", "interactive", "glow", "class", "children"]);

  const classes = () => {
    const parts = ["card"];
    if (local.hover) parts.push("card--hover");
    if (local.interactive) parts.push("card--interactive");
    if (local.glow) {
      if (local.glow === true || local.glow === "default") {
        parts.push("card--glow");
      } else if (local.glow === "emphasis") {
        parts.push("card--glow-emphasis");
      } else if (local.glow === "strong") {
        parts.push("card--glow-strong");
      }
    }
    if (local.class) parts.push(local.class);
    return parts.filter(Boolean).join(" ");
  };

  return (
    <article class={classes()} {...rest}>
      {local.children}
    </article>
  );
}
