import { Title } from "@solidjs/meta";
import { createSignal, Show, For } from "solid-js";
import { A } from "@solidjs/router";
import { submissionSchema, type SubmissionInput } from "@locallama/shared";
import { api } from "../lib/api";
import { Turnstile } from "../components/Turnstile";
import { generateFingerprint } from "../lib/fingerprint";

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
      { name: "description", label: "Description", type: "textarea", placeholder: "Optional notes" },
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
      { name: "repeatPenalty", label: "Repeat Penalty", type: "number", min: 0, max: 2, step: 0.01 },
      { name: "mirostat", label: "Mirostat", type: "number", min: 0, max: 2 },
      { name: "mirostatTau", label: "Mirostat Tau", type: "number", min: 0, step: 0.01 },
      { name: "mirostatEta", label: "Mirostat Eta", type: "number", min: 0, step: 0.01 },
      { name: "seed", label: "Seed", type: "number" },
    ],
  },
  {
    title: "Command",
    fields: [
      { name: "command", label: "Command", type: "textarea", placeholder: "./llama-cli -m model.gguf ..." },
    ],
  },
];

export default function SubmitPage() {
  const [formData, setFormData] = createSignal<Partial<SubmissionInput>>({});
  const [turnstileToken, setTurnstileToken] = createSignal<string>("");
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [submitting, setSubmitting] = createSignal(false);
  const [success, setSuccess] = createSignal<{ id: number; editToken: string } | null>(null);
  const [copied, setCopied] = createSignal(false);

  const updateField = (name: keyof SubmissionInput, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
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
      const response = await api.createSubmission(
        result.data,
        turnstileToken(),
        fingerprint
      );
      setSuccess({ id: response.submission.id, editToken: response.editToken });
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Submission failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const copyAdminLink = async () => {
    if (!success()) return;
    const url = `${window.location.origin}/submissions/${success()!.id}/admin/${success()!.editToken}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main class="mx-auto max-w-2xl px-4 py-8">
      <Title>Submit Benchmark - LocalLlama</Title>

      <Show when={success()}>
        <div class="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/20">
          <h2 class="mb-2 text-lg font-semibold text-green-800 dark:text-green-200">
            Submission Successful!
          </h2>
          <p class="mb-4 text-green-700 dark:text-green-300">
            Your benchmark has been submitted successfully.
          </p>

          <div class="mb-4 rounded bg-white p-3 dark:bg-gray-800">
            <p class="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              Admin Link (save this to edit/delete your submission):
            </p>
            <code class="block break-all text-xs text-gray-600 dark:text-gray-400">
              {window.location.origin}/submissions/{success()!.id}/admin/{success()!.editToken}
            </code>
          </div>

          <div class="flex gap-2">
            <button
              type="button"
              onClick={copyAdminLink}
              class="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              {copied() ? "Copied!" : "Copy Admin Link"}
            </button>
            <A
              href={`/submissions/${success()!.id}`}
              class="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              View Submission
            </A>
          </div>
        </div>
      </Show>

      <Show when={!success()}>
        <h1 class="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
          Submit Benchmark
        </h1>

        <form onSubmit={handleSubmit}>
          <For each={formSections}>
            {(section) => (
              <fieldset class="mb-6">
                <legend class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {section.title}
                </legend>
                <div class="grid gap-4 sm:grid-cols-2">
                  <For each={section.fields}>
                    {(field) => (
                      <div class={field.type === "textarea" ? "sm:col-span-2" : ""}>
                        <label
                          for={field.name}
                          class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
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
                              value={String(formData()[field.name] ?? "")}
                              onInput={(e) =>
                                updateField(
                                  field.name,
                                  field.type === "number"
                                    ? e.currentTarget.value
                                      ? Number(e.currentTarget.value)
                                      : undefined
                                    : e.currentTarget.value || undefined
                                )
                              }
                              class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                              classList={{
                                "border-red-500": !!errors()[field.name],
                              }}
                            />
                          }
                        >
                          <textarea
                            id={field.name}
                            placeholder={field.placeholder}
                            value={String(formData()[field.name] ?? "")}
                            onInput={(e) =>
                              updateField(
                                field.name,
                                e.currentTarget.value || undefined
                              )
                            }
                            rows={3}
                            class="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            classList={{
                              "border-red-500": !!errors()[field.name],
                            }}
                          />
                        </Show>
                        <Show when={errors()[field.name]}>
                          <p class="mt-1 text-xs text-red-500">
                            {errors()[field.name]}
                          </p>
                        </Show>
                      </div>
                    )}
                  </For>
                </div>
              </fieldset>
            )}
          </For>

          <div class="mb-6">
            <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Verification
            </label>
            <Turnstile onVerify={setTurnstileToken} />
            <Show when={errors().turnstile}>
              <p class="mt-1 text-xs text-red-500">{errors().turnstile}</p>
            </Show>
          </div>

          <Show when={errors().submit}>
            <div class="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
              {errors().submit}
            </div>
          </Show>

          <button
            type="submit"
            disabled={submitting()}
            class="w-full rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting() ? "Submitting..." : "Submit Benchmark"}
          </button>
        </form>
      </Show>
    </main>
  );
}
