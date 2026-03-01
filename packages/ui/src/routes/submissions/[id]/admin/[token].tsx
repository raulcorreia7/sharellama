import { Title } from "@solidjs/meta";
import { createSignal, createResource, Show, For } from "solid-js";
import { useParams, useNavigate, A } from "@solidjs/router";
import { submissionUpdateSchema, type SubmissionUpdate } from "@sharellama/model";
import { api } from "../../../../lib/api";

type FormField = {
  name: keyof SubmissionUpdate;
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
      { name: "title", label: "Title", type: "text" },
      { name: "description", label: "Description", type: "textarea" },
    ],
  },
  {
    title: "Hardware",
    fields: [
      { name: "cpu", label: "CPU", type: "text" },
      { name: "gpu", label: "GPU", type: "text" },
      { name: "ramGb", label: "RAM (GB)", type: "number", min: 1 },
    ],
  },
  {
    title: "Runtime",
    fields: [
      { name: "runtime", label: "Runtime", type: "text" },
      { name: "runtimeVersion", label: "Version", type: "text" },
    ],
  },
  {
    title: "Model",
    fields: [
      { name: "modelName", label: "Model Name", type: "text" },
      { name: "quantization", label: "Quantization", type: "text" },
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
    fields: [{ name: "command", label: "Command", type: "textarea" }],
  },
];

export default function AdminEditPage() {
  const params = useParams();
  const navigate = useNavigate();
  const id = () => Number(params.id);
  const token = () => params.token;

  const [submission] = createResource(id, (i) => api.getSubmission(i));

  const [formData, setFormData] = createSignal<Partial<SubmissionUpdate>>({});
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [submitting, setSubmitting] = createSignal(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const [loaded, setLoaded] = createSignal(false);

  const initializeForm = () => {
    if (submission() && !loaded()) {
      const s = submission()!;
      setFormData({
        title: s.title,
        description: s.description ?? undefined,
        cpu: s.cpu ?? undefined,
        gpu: s.gpu ?? undefined,
        ramGb: s.ramGb ?? undefined,
        runtime: s.runtime,
        runtimeVersion: s.runtimeVersion ?? undefined,
        modelName: s.modelName,
        quantization: s.quantization ?? undefined,
        contextLength: s.contextLength ?? undefined,
        command: s.command ?? undefined,
        temperature: s.temperature ?? undefined,
        topP: s.topP ?? undefined,
        topK: s.topK ?? undefined,
        minP: s.minP ?? undefined,
        repeatPenalty: s.repeatPenalty ?? undefined,
        mirostat: s.mirostat ?? undefined,
        mirostatTau: s.mirostatTau ?? undefined,
        mirostatEta: s.mirostatEta ?? undefined,
        seed: s.seed ?? undefined,
        tokensPerSecond: s.tokensPerSecond ?? undefined,
        latencyMs: s.latencyMs ?? undefined,
        memoryMb: s.memoryMb ?? undefined,
      });
      setLoaded(true);
    }
  };

  const updateField = (name: keyof SubmissionUpdate, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleUpdate = async (e: Event) => {
    e.preventDefault();
    setErrors({});

    const result = submissionUpdateSchema.safeParse(formData());
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await api.updateSubmission(id(), result.data, token()!);
      navigate(`/submissions/${id()}`);
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Update failed" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteSubmission(id(), token()!);
      navigate("/submissions");
    } catch (err) {
      setErrors({ delete: err instanceof Error ? err.message : "Delete failed" });
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main class="ll-page max-w-2xl">
      <Title>
        <Show when={submission()} fallback="Loading...">
          Edit {submission()?.title}
        </Show>{" "}
        - ShareLlama
      </Title>

      <nav class="mb-6 flex items-center gap-4 text-sm">
        <a href="/" class="ll-muted hover:text-[color:var(--text)]">
          Home
        </a>
        <span class="ll-muted">/</span>
        <a href="/submissions" class="ll-muted hover:text-[color:var(--text)]">
          Submissions
        </a>
        <span class="ll-muted">/</span>
        <span class="font-medium">Admin Edit</span>
      </nav>

      <Show when={submission.loading}>
        <div class="ll-muted py-12 text-center">Loading...</div>
      </Show>

      <Show when={submission.error}>
        <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          Error: {submission.error?.message}
        </div>
      </Show>

      <Show when={submission()}>
        {(_) => {
          initializeForm();
          return (
            <>
              <div class="mb-6 flex items-center justify-between">
                <h1 class="text-2xl font-bold">Edit Submission</h1>
                <A
                  href={`/submissions/${id()}`}
                  class="text-sm text-[color:var(--brand)] hover:underline"
                >
                  View Submission
                </A>
              </div>

              <form onSubmit={handleUpdate}>
                <For each={formSections}>
                  {(section) => (
                    <fieldset class="ll-card mb-6 p-4">
                      <legend class="ll-muted mb-3 text-sm font-semibold uppercase tracking-wide">
                        {section.title}
                      </legend>
                      <div class="grid gap-4 sm:grid-cols-2">
                        <For each={section.fields}>
                          {(field) => (
                            <div class={field.type === "textarea" ? "sm:col-span-2" : ""}>
                              <label for={field.name} class="mb-1 block text-sm font-medium">
                                {field.label}
                              </label>
                              <Show
                                when={field.type === "textarea"}
                                fallback={
                                  <input
                                    id={field.name}
                                    type={field.type}
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
                                          : e.currentTarget.value || undefined,
                                      )
                                    }
                                    class="ll-input px-3 py-2 text-sm"
                                    classList={{
                                      "border-red-500": !!errors()[field.name],
                                    }}
                                  />
                                }
                              >
                                <textarea
                                  id={field.name}
                                  value={String(formData()[field.name] ?? "")}
                                  onInput={(e) =>
                                    updateField(field.name, e.currentTarget.value || undefined)
                                  }
                                  rows={3}
                                  class="ll-textarea px-3 py-2 text-sm"
                                  classList={{
                                    "border-red-500": !!errors()[field.name],
                                  }}
                                />
                              </Show>
                              <Show when={errors()[field.name]}>
                                <p class="mt-1 text-xs text-red-500">{errors()[field.name]}</p>
                              </Show>
                            </div>
                          )}
                        </For>
                      </div>
                    </fieldset>
                  )}
                </For>

                <Show when={errors().submit}>
                  <div class="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {errors().submit}
                  </div>
                </Show>

                <button
                  type="submit"
                  disabled={submitting()}
                  class="ll-btn-primary mb-6 w-full px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {submitting() ? "Saving..." : "Save Changes"}
                </button>
              </form>

              <div class="border-t border-[color:var(--border)] pt-6">
                <h2 class="ll-muted mb-3 text-sm font-semibold uppercase tracking-wide">
                  Danger Zone
                </h2>
                <Show when={errors().delete}>
                  <div class="mb-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
                    {errors().delete}
                  </div>
                </Show>
                <Show
                  when={showDeleteConfirm()}
                  fallback={
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      class="rounded border border-red-600/70 px-4 py-2 text-sm font-medium text-red-300 hover:bg-red-950/40"
                    >
                      Delete Submission
                    </button>
                  }
                >
                  <p class="ll-muted mb-3 text-sm">Are you sure? This cannot be undone.</p>
                  <div class="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting()}
                      class="ll-btn-danger px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {deleting() ? "Deleting..." : "Yes, Delete"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      class="ll-btn-secondary px-4 py-2 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </Show>
              </div>
            </>
          );
        }}
      </Show>
    </main>
  );
}
