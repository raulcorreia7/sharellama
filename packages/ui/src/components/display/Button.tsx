import { JSX, splitProps } from "solid-js";

export interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  block?: boolean;
}

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, ["variant", "size", "block", "class", "children"]);

  const variantClass = () => {
    switch (local.variant) {
      case "primary":
        return "btn--primary";
      case "secondary":
        return "btn--secondary";
      case "ghost":
        return "btn--ghost";
      default:
        return "btn--secondary";
    }
  };

  const sizeClass = () => {
    switch (local.size) {
      case "sm":
        return "btn--sm";
      case "lg":
        return "btn--lg";
      default:
        return "";
    }
  };

  const classes = () => {
    const parts = ["btn", variantClass(), sizeClass()];
    if (local.block) parts.push("btn--block");
    if (local.class) parts.push(local.class);
    return parts.filter(Boolean).join(" ");
  };

  return (
    <button class={classes()} {...rest}>
      {local.children}
    </button>
  );
}
