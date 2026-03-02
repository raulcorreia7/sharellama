/**
 * StatTag - Display statistical data with an icon
 *
 * @description
 * Reusable component for displaying metrics like downloads, likes, or config counts.
 * Shows icon + value only (no labels) for compact, consistent presentation.
 *
 * @example
 * ```tsx
 * <StatTag icon={<Download size={14} />} value="587K" />
 * <StatTag icon={<Heart size={14} />} value={formatNumber(likes)} />
 * <StatTag icon={<LayoutGrid size={14} />} value={`${configCount}`} />
 * ```
 */
import { JSX, splitProps } from "solid-js";

export interface StatTagProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  /** Icon element to display (typically 14px Lucide icon) */
  icon: JSX.Element;
  /** Value to display (number or formatted string) */
  value: string | number;
  /** Optional variant for different visual emphasis */
  variant?: "default" | "neutral";
}

export function StatTag(props: StatTagProps) {
  const [local, rest] = splitProps(props, ["icon", "value", "variant", "class", "children"]);

  const classes = () => {
    const parts = ["tag"];
    if (local.variant === "neutral") parts.push("tag--neutral");
    if (local.class) parts.push(local.class);
    return parts.filter(Boolean).join(" ");
  };

  return (
    <span class={classes()} {...rest}>
      <span style={{ display: "inline-flex", "align-items": "center", gap: "0.375rem" }}>
        {local.icon}
        {local.value}
      </span>
    </span>
  );
}
