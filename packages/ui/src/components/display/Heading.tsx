import { JSX, splitProps } from "solid-js";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingProps extends JSX.HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
}

export function Heading(props: HeadingProps) {
  const [local, rest] = splitProps(props, ["level", "class", "children"]);

  const Tag = `h${local.level || 2}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

  const classes = () => {
    const parts = [];
    if (local.level === 1) parts.push("page-title");
    else if (local.level === 2) parts.push("section-title");
    if (local.class) parts.push(local.class);
    return parts.filter(Boolean).join(" ");
  };

  return (
    <Tag class={classes()} {...rest}>
      {local.children}
    </Tag>
  );
}
