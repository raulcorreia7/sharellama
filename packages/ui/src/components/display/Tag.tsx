import { JSX, splitProps } from "solid-js";

export interface TagProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "neutral";
  size?: "xs" | "sm" | "md";
  removable?: boolean;
}

export function Tag(props: TagProps) {
  const [local, rest] = splitProps(props, ["variant", "size", "removable", "class", "children"]);

  const classes = () => {
    const parts = ["tag"];
    if (local.variant === "neutral") parts.push("tag--neutral");
    if (local.removable) parts.push("tag--removable");
    if (local.class) parts.push(local.class);
    return parts.filter(Boolean).join(" ");
  };

  return (
    <span class={classes()} {...rest}>
      {local.children}
    </span>
  );
}
