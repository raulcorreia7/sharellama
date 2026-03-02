import { JSX, splitProps } from "solid-js";

export type TextVariant = "default" | "muted" | "secondary" | "dim";
export type TextSize = "xs" | "sm" | "base" | "lg";
export type TextWeight = "normal" | "medium" | "semibold";

export interface TextProps extends JSX.HTMLAttributes<HTMLParagraphElement> {
  variant?: TextVariant;
  size?: TextSize;
  weight?: TextWeight;
  mono?: boolean;
}

export function Text(props: TextProps) {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "weight",
    "mono",
    "class",
    "children",
  ]);

  const variantClass = () => {
    switch (local.variant) {
      case "muted":
        return "text-muted";
      case "secondary":
        return "text-secondary";
      case "dim":
        return "text-dim";
      default:
        return "";
    }
  };

  const sizeClass = () => {
    switch (local.size) {
      case "xs":
        return "text-xs";
      case "sm":
        return "text-sm";
      case "lg":
        return "text-lg";
      default:
        return "";
    }
  };

  const weightClass = () => {
    switch (local.weight) {
      case "medium":
        return "font-medium";
      case "semibold":
        return "font-semibold";
      default:
        return "";
    }
  };

  const classes = () => {
    const parts = [
      variantClass(),
      sizeClass(),
      weightClass(),
      local.mono ? "font-mono" : "",
      local.class,
    ];
    return parts.filter(Boolean).join(" ");
  };

  return (
    <p class={classes()} {...rest}>
      {local.children}
    </p>
  );
}
