import { MetaProvider, Title, Link } from "@solidjs/meta";
import { Router } from "@solidjs/router";
import { FileRoutes } from "@solidjs/start/router";
import { Suspense } from "solid-js";
import "./app.css";

export default function App() {
  return (
    <Router
      root={(props) => (
        <MetaProvider>
          <Link rel="preconnect" href="https://fonts.bunny.net" />
          <Link
            rel="stylesheet"
            href="https://fonts.bunny.net/css?family=inter:wght@400;500;600;700|jetbrains-mono:wght@400;500"
          />
          <Title>ShareLlama</Title>
          <Suspense>
            <div class="min-h-screen">{props.children}</div>
          </Suspense>
        </MetaProvider>
      )}
    >
      <FileRoutes />
    </Router>
  );
}
