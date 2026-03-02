import { JSX, splitProps } from "solid-js";

export interface SkeletonProps extends JSX.HTMLAttributes<HTMLDivElement> {
  width?: string;
  height?: string;
}

export function Skeleton(props: SkeletonProps) {
  const [local, rest] = splitProps(props, ["width", "height", "class"]);

  const style = () => ({
    width: local.width,
    height: local.height,
    ...(rest.style as JSX.CSSProperties),
  });

  return <div class={`skeleton ${local.class || ""}`} style={style()} {...rest} />;
}
