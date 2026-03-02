import { onMount } from "solid-js";
import { useNavigate } from "@solidjs/router";

export default function DetectRedirect() {
  const navigate = useNavigate();

  onMount(() => {
    navigate("/submit", { replace: true });
  });

  return (
    <main class="page" style={{ "max-width": "48rem" }}>
      <p class="text-muted">Redirecting to submit page...</p>
    </main>
  );
}
