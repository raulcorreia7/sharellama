import { Title } from "@solidjs/meta";
import { createSignal, onMount } from "solid-js";

export default function Detect() {
  const [cpu, setCpu] = createSignal("");
  const [gpu, setGpu] = createSignal("");
  const [ram, setRam] = createSignal("");
  const [browserCores, setBrowserCores] = createSignal<number | null>(null);
  const [browserRam, setBrowserRam] = createSignal<number | null>(null);
  const [copied, setCopied] = createSignal(false);

  onMount(() => {
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
    const base = window.location.origin;
    return `${base}/submit?${params.toString()}`;
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
    <main class="p-6 max-w-2xl mx-auto">
      <Title>Hardware Detection - LocalLlama</Title>
      <h1 class="text-2xl font-bold mb-4">Hardware Detection</h1>

      <section class="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <h2 class="font-semibold mb-2">Browser Detection (Limited)</h2>
        <p>CPU Cores: {browserCores() ?? "Unknown"}</p>
        <p>Approximate RAM: {browserRam() ? `${browserRam()} GB` : "Unknown"}</p>
      </section>

      <section class="mb-6 p-4 border rounded">
        <h2 class="font-semibold mb-2">Download Detection Scripts</h2>
        <p class="mb-2 text-sm text-gray-600">Run these for accurate hardware info:</p>
        <ul class="space-y-1">
          <li>
            <a href="/detect.sh" download class="text-blue-600 hover:underline">detect.sh</a>
            <span class="text-sm text-gray-500 ml-2">(Linux/macOS)</span>
          </li>
          <li>
            <a href="/detect.ps1" download class="text-blue-600 hover:underline">detect.ps1</a>
            <span class="text-sm text-gray-500 ml-2">(Windows)</span>
          </li>
        </ul>
      </section>

      <section class="mb-6">
        <h2 class="font-semibold mb-2">Manual Input</h2>
        <div class="space-y-3">
          <div>
            <label class="block text-sm mb-1">CPU</label>
            <input
              type="text"
              value={cpu()}
              onInput={(e) => setCpu(e.currentTarget.value)}
              placeholder="e.g., AMD Ryzen 9 5950X"
              class="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label class="block text-sm mb-1">GPU</label>
            <input
              type="text"
              value={gpu()}
              onInput={(e) => setGpu(e.currentTarget.value)}
              placeholder="e.g., NVIDIA RTX 4090"
              class="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label class="block text-sm mb-1">RAM (GB)</label>
            <input
              type="number"
              value={ram()}
              onInput={(e) => setRam(e.currentTarget.value)}
              placeholder="e.g., 64"
              class="w-full p-2 border rounded"
            />
          </div>
        </div>
      </section>

      <section class="p-4 bg-gray-50 dark:bg-gray-900 rounded">
        <h2 class="font-semibold mb-2">Submission URL</h2>
        <div class="flex gap-2">
          <input
            type="text"
            value={submissionUrl()}
            readonly
            class="flex-1 p-2 border rounded text-sm font-mono"
          />
          <button
            onClick={copyUrl}
            class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {copied() ? "Copied!" : "Copy"}
          </button>
        </div>
      </section>
    </main>
  );
}
