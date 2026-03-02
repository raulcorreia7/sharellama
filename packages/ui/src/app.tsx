import { Suspense } from "solid-js";
import { Link, MetaProvider, Title } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";

import OfflineBanner from "./components/OfflineBanner";
import { ConnectionProvider } from "./lib/ConnectionContext";

import "./app.css";

export default function App() {
  return (
    <ConnectionProvider>
      <Router
        root={(props) => (
          <MetaProvider>
            <Link rel="preconnect" href="https://fonts.bunny.net" />
            <Link
              rel="stylesheet"
              href="https://fonts.bunny.net/css?family=inter:wght@400;500;600;700|jetbrains-mono:wght@400;500"
            />
            <script>
              {`
                (function() {
                  try {
                    const theme = localStorage.getItem('ll-theme');
                    if (theme) {
                      document.documentElement.setAttribute('data-theme', theme);
                    }
                  } catch (e) {}
                })();
              `}
            </script>
            <Title>ShareLlama</Title>
            <OfflineBanner />
            <Suspense>
              <div class="min-h-screen">{props.children}</div>
            </Suspense>
          </MetaProvider>
        )}
      >
        <FileRoutes />
      </Router>
    </ConnectionProvider>
  );
}
