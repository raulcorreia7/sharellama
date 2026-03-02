import { JSX, splitProps } from "solid-js";

export interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  withIcon?: boolean;
}

export function Input(props: InputProps) {
  const [local, rest] = splitProps(props, ["error", "withIcon", "class"]);

  const classes = () => {
    const parts = ["input"];
    if (local.error) parts.push("input--error");
    if (local.withIcon) parts.push("input--with-icon");
    if (local.class) parts.push(local.class);
    return parts.filter(Boolean).join(" ");
  };

  return <input class={classes()} {...rest} />;
}
