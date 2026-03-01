import { Title } from "@solidjs/meta";
import { createSignal, onMount } from "solid-js";

export default function Detect() {
  const [cpu, setCpu] = createSignal("");
  const [gpu, setGpu] = createSignal("");
  const [ram, setRam] = createSignal("");
  const [browserCores, setBrowserCores] = createSignal<number | null>(null);
  const [browserRam, setBrowserRam] = createSignal<number | null>(null);
  const [copied, setCopied] = createSignal(false);
  const [origin, setOrigin] = createSignal("");

  onMount(() => {
    setOrigin(window.location.origin);
    setBrowserCores(navigator.hardwareConcurrency || null);
    if ("deviceMemory" in navigator) {
      setBrowserRam((navigator as Navigator & { deviceMemory?: number }).deviceMemory || null);
    }
  });

  const submissionUrl = () => {
    const params = new URLSearchParams();
    if (cpu()) params.set("cpu", cpu());
    if (gpu()) params.set("gpu", gpu());
    if (ram()) params.set("ram", ram());
    const base = origin();
    const query = params.toString();
    return query ? `${base}/submit?${query}` : `${base}/submit`;
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(submissionUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  return (
    <main class="ll-page max-w-2xl">
      <Title>Hardware Detection - ShareLlama</Title>

      <nav class="mb-6 flex items-center gap-4 text-sm">
        <a href="/" class="ll-muted hover:text-[color:var(--text)]">
          Home
        </a>
        <span class="ll-muted">/</span>
        <span class="font-medium">Hardware Detection</span>
      </nav>

      <h1 class="mb-4 text-2xl font-bold">Hardware Detection</h1>

      <section class="ll-card mb-6 p-4">
        <h2 class="mb-2 font-semibold">Browser Detection (Limited)</h2>
        <p>CPU Cores: {browserCores() ?? "Unknown"}</p>
        <p>Approximate RAM: {browserRam() ? `${browserRam()} GB` : "Unknown"}</p>
      </section>

      <section class="ll-card mb-6 p-4">
        <h2 class="mb-2 font-semibold">Download Detection Scripts</h2>
        <p class="ll-muted mb-2 text-sm">Run these for accurate hardware info:</p>
        <ul class="space-y-1">
          <li>
            <a href="/detect.sh" class="text-[color:var(--brand)] hover:underline">
              detect.sh
            </a>
            <span class="ll-muted ml-2 text-sm">(Linux/macOS)</span>
          </li>
          <li>
            <a href="/detect.ps1" class="text-[color:var(--brand)] hover:underline">
              detect.ps1
            </a>
            <span class="ll-muted ml-2 text-sm">(Windows)</span>
          </li>
        </ul>
      </section>

      <section class="mb-6">
        <h2 class="mb-2 font-semibold">Manual Input</h2>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-sm">CPU</label>
            <input
              type="text"
              value={cpu()}
              onInput={(e) => setCpu(e.currentTarget.value)}
              placeholder="e.g., AMD Ryzen 9 5950X"
              class="ll-input p-2"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm">GPU</label>
            <input
              type="text"
              value={gpu()}
              onInput={(e) => setGpu(e.currentTarget.value)}
              placeholder="e.g., NVIDIA RTX 4090"
              class="ll-input p-2"
            />
          </div>
          <div>
            <label class="mb-1 block text-sm">RAM (GB)</label>
            <input
              type="number"
              value={ram()}
              onInput={(e) => setRam(e.currentTarget.value)}
              placeholder="e.g., 64"
              class="ll-input p-2"
            />
          </div>
        </div>
      </section>

      <section class="ll-card p-4">
        <h2 class="mb-2 font-semibold">Submission URL</h2>
        <div class="flex gap-2">
          <input
            type="text"
            value={submissionUrl()}
            readonly
            class="ll-input flex-1 p-2 text-sm font-mono"
          />
          <button onClick={copyUrl} class="ll-btn-primary px-4 py-2">
            {copied() ? "Copied!" : "Copy"}
          </button>
        </div>
      </section>
    </main>
  );
}
