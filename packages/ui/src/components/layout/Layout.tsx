import { JSX } from "solid-js";

import { Footer, type FooterProps } from "./Footer";
import { Header } from "./Header";

export interface LayoutProps {
  children: JSX.Element;
  stats?: FooterProps["stats"];
}

export function Layout(props: LayoutProps) {
  return (
    <div class="layout">
      <Header />
      <main class="main">{props.children}</main>
      <Footer stats={props.stats} />
    </div>
  );
}
