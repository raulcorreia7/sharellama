import { Show } from "solid-js";
import { A } from "@solidjs/router";

import { Code, Github } from "../icons";

interface FooterStats {
  totalSubmissions: number;
  uniqueModels: number;
  uniqueGpus: number;
}

export interface FooterProps {
  stats?: FooterStats;
}

function hasStats(stats?: FooterStats): boolean {
  return !!(stats && stats.totalSubmissions > 0);
}

export function Footer(props: FooterProps) {
  return (
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <span>🦙</span>
          <span class="footer-brand-text">ShareLlama</span>
        </div>
        <nav class="footer-nav">
          <A
            href="/api"
            class="footer-nav-link"
            style={{ display: "flex", "align-items": "center", gap: "0.375rem" }}
          >
            <Code size={16} />
            API
          </A>
          <a
            href="https://github.com/sharellama/sharellama"
            target="_blank"
            rel="noopener noreferrer"
            class="footer-nav-link"
            style={{ display: "flex", "align-items": "center", gap: "0.375rem" }}
          >
            <Github size={16} />
            GitHub
          </a>
        </nav>
      </div>
      <Show when={hasStats(props.stats)}>
        <div class="footer-bottom">
          <span class="footer-stats">
            {props.stats!.totalSubmissions} configurations | {props.stats!.uniqueModels} models |{" "}
            {props.stats!.uniqueGpus} GPUs
          </span>
        </div>
      </Show>
    </footer>
  );
}
