import { A } from "@solidjs/router";

import { ThemeSwitcher } from "../ThemeSwitcher";

export function Header() {
  return (
    <header class="header">
      <div class="header-inner">
        <A href="/" class="header-logo">
          <span class="header-emoji">🦙</span>
          <span class="header-title">ShareLlama</span>
        </A>
        <div class="header-actions">
          <nav class="header-nav">
            <A href="/models" class="header-nav-link">
              Models
            </A>
            <A href="/submissions" class="header-nav-link">
              Browse
            </A>
            <A href="/submit" class="btn btn--primary btn--sm">
              Submit
            </A>
          </nav>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
