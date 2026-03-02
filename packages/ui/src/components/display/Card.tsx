import { JSX, splitProps } from "solid-js";

export interface CardProps extends JSX.HTMLAttributes<HTMLElement> {
  hover?: boolean;
  interactive?: boolean;
}

export function Card(props: CardProps) {
  const [local, rest] = splitProps(props, ["hover", "interactive", "class", "children"]);

  const classes = () => {
    const parts = ["card"];
    if (local.hover) parts.push("card--hover");
    if (local.interactive) parts.push("card--interactive");
    if (local.class) parts.push(local.class);
    return parts.filter(Boolean).join(" ");
  };

  return (
    <article class={classes()} {...rest}>
      {local.children}
    </article>
  );
}
