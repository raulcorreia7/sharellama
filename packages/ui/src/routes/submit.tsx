import { Title } from "@solidjs/meta";
import { createSignal, Show, For } from "solid-js";
import { A, useLocation } from "@solidjs/router";
import { submissionSchema, type SubmissionInput } from "@sharellama/model";
import { api } from "../lib/api";
import { Turnstile } from "../components/Turnstile";
import { generateFingerprint } from "../lib/fingerprint";
import { parseLlamaCppCommand } from "../lib/commandParser";

type FormField = {
  name: keyof SubmissionInput;
  label: string;
  type: "text" | "number" | "textarea";
  placeholder?: string;
  step?: number;
  min?: number;
  max?: number;
};

const formSections: { title: string; fields: FormField[] }[] = [
  {
    title: "Basic Info",
    fields: [
      { name: "title", label: "Title", type: "text", placeholder: "My benchmark result" },
      {
        name: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Optional notes",
      },
    ],
  },
  {
    title: "Hardware",
    fields: [
      { name: "cpu", label: "CPU", type: "text", placeholder: "AMD Ryzen 9 5950X" },
      { name: "gpu", label: "GPU", type: "text", placeholder: "NVIDIA RTX 4090" },
      { name: "ramGb", label: "RAM (GB)", type: "number", min: 1 },
    ],
  },
  {
    title: "Runtime",
    fields: [
      { name: "runtime", label: "Runtime", type: "text", placeholder: "llama.cpp" },
      { name: "runtimeVersion", label: "Version", type: "text", placeholder: "b1234" },
    ],
  },
  {
    title: "Model",
    fields: [
      { name: "modelName", label: "Model Name", type: "text", placeholder: "Llama-3-8B" },
      { name: "quantization", label: "Quantization", type: "text", placeholder: "Q4_K_M" },
      { name: "contextLength", label: "Context Length", type: "number", min: 1 },
    ],
  },
  {
    title: "Performance",
    fields: [
      { name: "tokensPerSecond", label: "Tokens/sec", type: "number", min: 0, step: 0.01 },
      { name: "latencyMs", label: "Latency (ms)", type: "number", min: 0 },
      { name: "memoryMb", label: "Memory (MB)", type: "number", min: 0 },
    ],
  },
  {
    title: "Sampling Parameters",
    fields: [
      { name: "temperature", label: "Temperature", type: "number", min: 0, max: 2, step: 0.01 },
      { name: "topP", label: "Top P", type: "number", min: 0, max: 1, step: 0.01 },
      { name: "topK", label: "Top K", type: "number", min: 0 },
      { name: "minP", label: "Min P", type: "number", min: 0, max: 1, step: 0.01 },
      {
        name: "repeatPenalty",
        label: "Repeat Penalty",
        type: "number",
        min: 0,
        max: 2,
        step: 0.01,
      },
      { name: "mirostat", label: "Mirostat", type: "number", min: 0, max: 2 },
      { name: "mirostatTau", label: "Mirostat Tau", type: "number", min: 0, step: 0.01 },
      { name: "mirostatEta", label: "Mirostat Eta", type: "number", min: 0, step: 0.01 },
      { name: "seed", label: "Seed", type: "number" },
    ],
  },
  {
    title: "Command",
    fields: [
      {
        name: "command",
        label: "Command",
        type: "textarea",
        placeholder: "./llama-cli -m model.gguf ...",
      },
    ],
  },
];

export default function SubmitPage() {
  const location = useLocation();
  const [formData, setFormData] = createSignal<Partial<SubmissionInput>>({});
  const [turnstileToken, setTurnstileToken] = createSignal<string>("");
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [submitting, setSubmitting] = createSignal(false);
  const [success, setSuccess] = createSignal<{ id: number; editToken: string } | null>(null);
  const [copied, setCopied] = createSignal(false);
  const [parseFeedback, setParseFeedback] = createSignal(false);

  const prefilledFields = (): Partial<SubmissionInput> => {
    const params = new URLSearchParams(location.search);
    const ram = params.get("ram");
    return {
      cpu: params.get("cpu") ?? undefined,
      gpu: params.get("gpu") ?? undefined,
      ramGb: ram ? Number(ram) || undefined : undefined,
    };
  };

  const currentOrigin = () => (typeof window === "undefined" ? "" : window.location.origin);

  const getFieldValue = (name: keyof SubmissionInput): string => {
    const value = formData()[name] ?? prefilledFields()[name];
    return value !== undefined ? String(value) : "";
  };

  const updateField = (name: keyof SubmissionInput, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const parseCommand = () => {
    const command = formData().command;
    if (!command) return;

    const parsed = parseLlamaCppCommand(command);
    setFormData((prev) => ({
      ...prev,
      ...parsed,
      title: prev.title || parsed.title,
      description: prev.description || parsed.description,
    }));

    setParseFeedback(true);
    setTimeout(() => setParseFeedback(false), 1500);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setErrors({});

    const result = submissionSchema.safeParse(formData());
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    if (!turnstileToken()) {
      setErrors({ turnstile: "Please complete the verification" });
      return;
    }

    setSubmitting(true);
    try {
      const fingerprint = await generateFingerprint();
      const response = await api.createSubmission(result.data, turnstileToken(), fingerprint);
      setSuccess({ id: response.submission.id, editToken: response.editToken });
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Submission failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const copyAdminLink = async () => {
    if (!success()) return;
    const url = `${currentOrigin()}/submissions/${success()!.id}/admin/${success()!.editToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main class="ll-page max-w-2xl">
      <Title>Submit Benchmark - ShareLlama</Title>

      <nav class="mb-8 flex items-center gap-2 text-sm">
        <a href="/" class="ll-nav-link">
          Home
        </a>
        <span class="text-[color:var(--text-dim)]">/</span>
        <a href="/submissions" class="ll-nav-link">
          Submissions
        </a>
        <span class="text-[color:var(--text-dim)]">/</span>
        <span class="font-medium text-[color:var(--text)]">Submit</span>
      </nav>

      <Show when={success()}>
        <div class="ll-card border-[color:var(--accent)] bg-[color:var(--accent-muted)] p-6 fade-in-up">
          <div class="mb-4 flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--accent)]">
              <svg
                class="h-5 w-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 class="text-display text-lg font-semibold text-[color:var(--accent-text)]">
                Submission Successful!
              </h2>
              <p class="text-sm text-[color:var(--text-muted)]">
                Your benchmark has been submitted.
              </p>
            </div>
          </div>

          <div class="ll-card mb-4 p-4">
            <p class="mb-2 text-sm font-medium">
              Admin Link (save this to edit/delete your submission):
            </p>
            <code class="text-mono block break-all text-xs text-[color:var(--text-muted)]">
              {currentOrigin()}/submissions/{success()!.id}/admin/{success()!.editToken}
            </code>
          </div>

          <div class="flex gap-3">
            <button type="button" onClick={copyAdminLink} class="ll-btn ll-btn-primary">
              {copied() ? "Copied!" : "Copy Admin Link"}
            </button>
            <A href={`/submissions/${success()!.id}`} class="ll-btn ll-btn-secondary">
              View Submission
            </A>
          </div>
        </div>
      </Show>

      <Show when={!success()}>
        <header class="mb-8">
          <h1 class="text-display text-2xl font-bold">Submit Benchmark</h1>
          <p class="mt-1 text-sm text-[color:var(--text-muted)]">
            Share your llama.cpp configuration and performance results with the community.
          </p>
        </header>

        <form onSubmit={handleSubmit} class="space-y-8">
          <For each={formSections}>
            {(section) => (
              <section>
                <h2 class="text-display mb-4 text-sm font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
                  {section.title}
                </h2>
                <div class="grid gap-4 sm:grid-cols-2">
                  <For each={section.fields}>
                    {(field) => (
                      <div class={field.type === "textarea" ? "sm:col-span-2" : ""}>
                        <label for={field.name} class="mb-1.5 block text-sm font-medium">
                          {field.label}
                        </label>
                        <Show
                          when={field.type === "textarea"}
                          fallback={
                            <input
                              id={field.name}
                              type={field.type}
                              placeholder={field.placeholder}
                              step={field.step}
                              min={field.min}
                              max={field.max}
                              value={getFieldValue(field.name)}
                              onInput={(e) =>
                                updateField(
                                  field.name,
                                  field.type === "number"
                                    ? e.currentTarget.value
                                      ? Number(e.currentTarget.value)
                                      : undefined
                                    : e.currentTarget.value || undefined,
                                )
                              }
                              class="ll-input"
                              classList={{ "border-red-500": !!errors()[field.name] }}
                            />
                          }
                        >
                          <textarea
                            id={field.name}
                            placeholder={field.placeholder}
                            value={getFieldValue(field.name)}
                            onInput={(e) =>
                              updateField(field.name, e.currentTarget.value || undefined)
                            }
                            rows={3}
                            class="ll-textarea"
                            classList={{ "border-red-500": !!errors()[field.name] }}
                          />
                          <Show when={field.name === "command"}>
                            <div class="mt-2">
                              <button
                                type="button"
                                onClick={parseCommand}
                                class={`ll-btn ll-btn-sm ${
                                  parseFeedback()
                                    ? "ll-btn-primary glow-pulse-once"
                                    : "ll-btn-secondary"
                                }`}
                              >
                                <Show when={parseFeedback()} fallback={<>Parse Command</>}>
                                  <svg
                                    class="h-4 w-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    stroke-width="2"
                                  >
                                    <path
                                      stroke-linecap="round"
                                      stroke-linejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                  Parsed
                                </Show>
                              </button>
                              <p class="mt-1 text-xs text-[color:var(--text-dim)]">
                                Auto-fill form from your llama.cpp command
                              </p>
                            </div>
                          </Show>
                        </Show>
                        <Show when={errors()[field.name]}>
                          <p class="mt-1 text-xs text-red-400">{errors()[field.name]}</p>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </section>
            )}
          </For>

          <section class="ll-card p-4">
            <h2 class="text-display mb-3 text-sm font-semibold uppercase tracking-wide text-[color:var(--text-muted)]">
              Verification
            </h2>
            <Turnstile onVerify={setTurnstileToken} />
            <Show when={errors().turnstile}>
              <p class="mt-2 text-xs text-red-400">{errors().turnstile}</p>
            </Show>
          </section>

          <Show when={errors().submit}>
            <div class="ll-card border-red-500/50 bg-red-500/10 p-4 text-sm text-red-400">
              {errors().submit}
            </div>
          </Show>

          <button
            type="submit"
            disabled={submitting()}
            class="ll-btn ll-btn-primary ll-btn-lg w-full press"
          >
            <Show when={submitting()} fallback={<>Submit Benchmark</>}>
              <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                />
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Submitting...
            </Show>
          </button>
        </form>
      </Show>
    </main>
  );
}
