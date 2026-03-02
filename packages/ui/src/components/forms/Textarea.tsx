import { JSX, splitProps } from "solid-js";

export interface TextareaProps extends JSX.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea(props: TextareaProps) {
  const [local, rest] = splitProps(props, ["error", "class"]);

  const classes = () => {
    const parts = ["textarea"];
    if (local.error) parts.push("input--error");
    if (local.class) parts.push(local.class);
    return parts.filter(Boolean).join(" ");
  };

  return <textarea class={classes()} {...rest} />;
}
