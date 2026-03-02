import { Title } from "@solidjs/meta";
import { createSignal, createResource, Show, For } from "solid-js";
import { useParams, useNavigate, A } from "@solidjs/router";
import { submissionUpdateSchema, type SubmissionUpdate } from "@sharellama/model";
import { api } from "../../../../lib/api";
import { Layout } from "../../../../components/layout";
import { Breadcrumbs } from "../../../../components/layout/Breadcrumbs";
import { Button } from "../../../../components/display/Button";
import { Card } from "../../../../components/display/Card";

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
      { name: "vramGb", label: "VRAM (GB)", type: "number", min: 1 },
    ],
  },
  {
    title: "Model Details",
    fields: [
      { name: "quantization", label: "Quantization", type: "text" },
      { name: "quantSource", label: "Quant Source", type: "text" },
      { name: "contextLength", label: "Context Length", type: "number", min: 1 },
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
        vramGb: s.vramGb ?? undefined,
        runtime: s.runtime,
        runtimeVersion: s.runtimeVersion ?? undefined,
        quantization: s.quantization ?? undefined,
        quantSource: s.quantSource ?? undefined,
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
    <Layout>
      <Title>
        <Show when={submission()} fallback="Loading...">
          Edit {submission()?.title}
        </Show>{" "}
        - ShareLlama
      </Title>

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Submissions", href: "/submissions" },
          { label: "Admin Edit" },
        ]}
      />

      <Show when={submission.loading}>
        <div class="text-muted" style={{ padding: "3rem 0", "text-align": "center" }}>
          Loading...
        </div>
      </Show>

      <Show when={submission.error}>
        <Card
          style={{
            padding: "1rem",
            "border-color": "var(--color-red-600)",
            "background-color": "var(--color-red-100)",
          }}
        >
          <p style={{ color: "var(--color-red-700)" }}>Error: {submission.error?.message}</p>
        </Card>
      </Show>

      <Show when={submission()}>
        {(_) => {
          initializeForm();
          return (
            <>
              <div class="page-header">
                <h1 class="page-title">Edit Submission</h1>
                <A href={`/submissions/${id()}`} class="link">
                  View Submission
                </A>
              </div>

              <form onSubmit={handleUpdate}>
                <For each={formSections}>
                  {(section) => (
                    <div class="submit-section">
                      <h2 class="submit-section-title">{section.title}</h2>
                      <Card style={{ padding: "1rem" }}>
                        <div class="submit-grid submit-grid--2col">
                          <For each={section.fields}>
                            {(field) => (
                              <div
                                class={
                                  field.type === "textarea"
                                    ? "submit-field submit-field--full"
                                    : "submit-field"
                                }
                              >
                                <label for={field.name} class="submit-label">
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
                                      classList={{
                                        input: true,
                                        "input--error": !!errors()[field.name],
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
                                    classList={{
                                      textarea: true,
                                      "input--error": !!errors()[field.name],
                                    }}
                                  />
                                </Show>
                                <Show when={errors()[field.name]}>
                                  <p class="submit-error">{errors()[field.name]}</p>
                                </Show>
                              </div>
                            )}
                          </For>
                        </div>
                      </Card>
                    </div>
                  )}
                </For>

                <Show when={errors().submit}>
                  <Card
                    style={{
                      padding: "0.75rem",
                      "border-color": "var(--color-red-600)",
                      "background-color": "var(--color-red-100",
                      "margin-bottom": "1rem",
                    }}
                  >
                    <p style={{ color: "var(--color-red-700)", "font-size": "0.875rem" }}>
                      {errors().submit}
                    </p>
                  </Card>
                </Show>

                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting()}
                  style={{ width: "100%", "margin-bottom": "2rem" }}
                >
                  {submitting() ? "Saving..." : "Save Changes"}
                </Button>
              </form>

              <Card style={{ padding: "1.5rem", "border-color": "var(--color-red-600)" }}>
                <h2
                  style={{
                    "font-size": "0.75rem",
                    "font-weight": 600,
                    "text-transform": "uppercase",
                    "letter-spacing": "0.05em",
                    color: "var(--color-text-muted)",
                    "margin-bottom": "1rem",
                  }}
                >
                  Danger Zone
                </h2>
                <Show when={errors().delete}>
                  <p
                    style={{
                      color: "var(--color-red-700)",
                      "font-size": "0.875rem",
                      "margin-bottom": "0.75rem",
                    }}
                  >
                    {errors().delete}
                  </p>
                </Show>
                <Show
                  when={showDeleteConfirm()}
                  fallback={
                    <Button
                      variant="secondary"
                      onClick={() => setShowDeleteConfirm(true)}
                      style={{
                        border: "1px solid var(--color-red-600)",
                        color: "var(--color-red-600)",
                      }}
                    >
                      Delete Submission
                    </Button>
                  }
                >
                  <p class="text-muted text-sm" style={{ "margin-bottom": "0.75rem" }}>
                    Are you sure? This cannot be undone.
                  </p>
                  <div class="submit-actions">
                    <Button
                      variant="primary"
                      onClick={handleDelete}
                      disabled={deleting()}
                      style={{ "background-color": "var(--color-red-600)" }}
                    >
                      {deleting() ? "Deleting..." : "Yes, Delete"}
                    </Button>
                    <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                      Cancel
                    </Button>
                  </div>
                </Show>
              </Card>
            </>
          );
        }}
      </Show>
    </Layout>
  );
}
