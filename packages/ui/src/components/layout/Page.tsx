import { JSX } from "solid-js";

export interface PageProps {
  variant?: "narrow" | "default" | "wide";
  children: JSX.Element;
}

export function Page(props: PageProps) {
  const variantClass = () => {
    switch (props.variant) {
      case "narrow":
        return "page--narrow";
      case "wide":
        return "page--wide";
      default:
        return "";
    }
  };

  return <main class={`page ${variantClass()}`}>{props.children}</main>;
}
