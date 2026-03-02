import { createEffect, createSignal, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A } from "@solidjs/router";

import { type HFModelResult, type SubmissionInput, submissionSchema } from "@sharellama/model";

import { Button } from "../components/display";
import { CopyButton, Input, Textarea } from "../components/forms";
import { Check, ChevronRight, ExternalLink, Loader2, Search } from "../components/icons";
import { Breadcrumbs, Layout, PageHeader, Section } from "../components/layout";
import { Turnstile } from "../components/Turnstile";
import { api, DEFAULT_STATS } from "../lib/api";
import { parseLlamaCppCommand } from "../lib/commandParser";
import { generateFingerprint } from "../lib/fingerprint";
import { useResourceWithDefault } from "../lib/useResourceWithDefault";

const REQUIRED_FIELDS = ["title", "runtime", "modelSlug"] as const;

const QUICK_FIELDS: Array<{
  name: keyof SubmissionInput;
  label: string;
  type: "text" | "number";
  placeholder?: string;
}> = [
  { name: "gpu", label: "GPU", type: "text", placeholder: "e.g., RTX 4090" },
  { name: "tokensPerSecond", label: "Tokens/sec", type: "number" },
];

const QUANTIZATION_OPTIONS = [
  "Q4_K_M",
  "Q4_K_S",
  "Q5_K_M",
  "Q5_K_S",
  "Q6_K",
  "Q8_0",
  "Q2_K",
  "Q3_K_M",
  "Q3_K_S",
  "Q4_0",
  "Q4_1",
  "Q5_0",
  "Q5_1",
  "F16",
  "F32",
];

const ADVANCED_SECTIONS: Array<{
  title: string;
  fields: Array<{
    name: keyof SubmissionInput;
    label: string;
    type: "text" | "number";
    placeholder?: string;
    step?: number;
    min?: number;
    max?: number;
  }>;
}> = [
  {
    title: "Hardware",
    fields: [
      { name: "cpu", label: "CPU", type: "text", placeholder: "e.g., Ryzen 9 5950X" },
      { name: "ramGb", label: "RAM (GB)", type: "number", min: 1 },
      { name: "vramGb", label: "VRAM (GB)", type: "number", min: 1 },
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
    title: "Model Details",
    fields: [
      { name: "contextLength", label: "Context Length", type: "number", min: 1 },
      { name: "quantSource", label: "Quant Source", type: "text", placeholder: "e.g., bartowski" },
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
    title: "Sampling",
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
];

export default function SubmitPage() {
  const [formData, setFormData] = createSignal<Partial<SubmissionInput>>({});
  const [turnstileToken, setTurnstileToken] = createSignal<string>("");
  const [errors, setErrors] = createSignal<Record<string, string>>({});
  const [submitting, setSubmitting] = createSignal(false);
  const [success, setSuccess] = createSignal<{ id: number; editToken: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = createSignal(false);
  const [parsed, setParsed] = createSignal(false);

  const [modelSearch, setModelSearch] = createSignal("");
  const [modelResults, setModelResults] = createSignal<HFModelResult[]>([]);
  const [searching, setSearching] = createSignal(false);
  const [selectedModel, setSelectedModel] = createSignal<HFModelResult | null>(null);

  const stats = useResourceWithDefault(() => api.getStats(), DEFAULT_STATS);

  const searchModels = async (query: string) => {
    if (query.length < 2) {
      setModelResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await api.searchModels(query);
      setModelResults(results);
    } catch {
      setModelResults([]);
    } finally {
      setSearching(false);
    }
  };

  createEffect(() => {
    const query = modelSearch();
    if (query && !selectedModel()) {
      const timeout = setTimeout(() => searchModels(query), 300);
      return () => clearTimeout(timeout);
    }
  });

  const selectModel = (model: HFModelResult) => {
    setSelectedModel(model);
    setFormData((prev) => ({ ...prev, modelSlug: model.id }));
    setModelSearch("");
    setModelResults([]);
  };

  const clearModel = () => {
    setSelectedModel(null);
    setFormData((prev) => {
      const { modelSlug: _, ...rest } = prev;
      return rest;
    });
  };

  const currentOrigin = () => (typeof window === "undefined" ? "" : window.location.origin);

  const getFieldValue = (name: keyof SubmissionInput): string => {
    const value = formData()[name];
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

  const handleCommandPaste = (e: ClipboardEvent) => {
    const text = e.clipboardData?.getData("text");
    if (!text || !text.includes("llama")) return;

    const parsedData = parseLlamaCppCommand(text);
    setFormData((prev) => ({
      ...prev,
      ...parsedData,
      command: prev.command || text,
      title: prev.title || parsedData.title,
      description: prev.description || parsedData.description,
    }));
    setParsed(true);
    setTimeout(() => setParsed(false), 2000);
  };

  const parseCommand = () => {
    const command = formData().command;
    if (!command) return;

    const parsedData = parseLlamaCppCommand(command);
    setFormData((prev) => ({
      ...prev,
      ...parsedData,
      title: prev.title || parsedData.title,
      description: prev.description || parsedData.description,
    }));
    setParsed(true);
    setTimeout(() => setParsed(false), 2000);
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

  const adminUrl = () =>
    success()
      ? `${currentOrigin()}/submissions/${success()!.id}/admin/${success()!.editToken}`
      : "";

  const hasError = (name: string) => !!errors()[name];
  const getError = (name: string) => errors()[name];

  const footerStats = () => {
    if (stats.loading || !stats()) return undefined;
    return {
      totalSubmissions: stats()!.totalSubmissions,
      uniqueModels: stats()!.uniqueModels,
      uniqueGpus: stats()!.uniqueGpus,
    };
  };

  return (
    <Layout stats={footerStats()}>
      <Title>ShareLlama - Submit Configuration</Title>

      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Submit" }]} />

      <Show when={success()}>
        <div class="submit-success fade-in-up">
          <div class="submit-success-header">
            <div class="submit-success-icon">
              <Check size={20} />
            </div>
            <div>
              <h2 class="submit-success-title">Submission Successful!</h2>
              <p class="submit-success-text">Your configuration has been submitted.</p>
            </div>
          </div>

          <div class="submit-admin-box">
            <p class="submit-admin-label">Admin Link (save this to edit/delete):</p>
            <code class="submit-admin-url">{adminUrl()}</code>
          </div>

          <div class="submit-actions">
            <CopyButton text={adminUrl()} label="Copy Admin Link" />
            <A href={`/submissions/${success()!.id}`}>
              <Button type="button" variant="secondary">
                View Configuration
              </Button>
            </A>
          </div>
        </div>
      </Show>

      <Show when={!success()}>
        <PageHeader
          title="Submit Configuration"
          description="Share your model configuration and performance results."
        />

        <form onSubmit={handleSubmit}>
          <Section card title="Model Selection">
            <Show when={!selectedModel()}>
              <div class="submit-field submit-field--full">
                <label class="submit-label">Search HuggingFace Models *</label>
                <div class="model-search">
                  <Search size={18} class="model-search-icon" />
                  <input
                    type="text"
                    class="input model-search-input"
                    placeholder="Search models (e.g., Llama-3, Qwen, Mistral)..."
                    value={modelSearch()}
                    onInput={(e) => setModelSearch(e.currentTarget.value)}
                  />
                  <Show when={searching()}>
                    <Loader2 size={16} class="model-search-loading icon--spin" />
                  </Show>
                </div>
                <Show when={hasError("modelSlug")}>
                  <p class="submit-error">{getError("modelSlug")}</p>
                </Show>
              </div>

              <Show when={modelResults().length > 0}>
                <div class="model-results">
                  <For each={modelResults().slice(0, 8)}>
                    {(model) => (
                      <button
                        type="button"
                        class="model-result-item"
                        onClick={() => selectModel(model)}
                      >
                        <div class="model-result-name">{model.id}</div>
                        <div class="model-result-meta">
                          <span>{model.pipeline_tag || "unknown"}</span>
                          <span>{(model.downloads / 1000).toFixed(0)}K downloads</span>
                        </div>
                      </button>
                    )}
                  </For>
                </div>
              </Show>
            </Show>

            <Show when={selectedModel()}>
              <div class="model-selected">
                <div class="model-selected-info">
                  <div class="model-selected-name">{selectedModel()!.id}</div>
                  <div class="model-selected-meta">
                    by {selectedModel()!.author} · {(selectedModel()!.downloads / 1000).toFixed(0)}K
                    downloads
                  </div>
                </div>
                <a
                  href={`https://huggingface.co/${selectedModel()!.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="btn btn--ghost btn--sm"
                >
                  <ExternalLink size={14} />
                  View on HF
                </a>
                <button type="button" class="btn btn--ghost btn--sm" onClick={clearModel}>
                  Change
                </button>
              </div>
            </Show>
          </Section>

          <Section card title="Quantization">
            <div class="submit-grid submit-grid--2col">
              <div class="submit-field">
                <label for="quantization" class="submit-label">
                  Quantization
                </label>
                <select
                  id="quantization"
                  class="input"
                  value={getFieldValue("quantization")}
                  onChange={(e) => updateField("quantization", e.currentTarget.value || undefined)}
                >
                  <option value="">Select quantization...</option>
                  <For each={QUANTIZATION_OPTIONS}>
                    {(quant) => <option value={quant}>{quant}</option>}
                  </For>
                </select>
              </div>
              <div class="submit-field">
                <label for="quantSource" class="submit-label">
                  Source
                </label>
                <Input
                  id="quantSource"
                  type="text"
                  placeholder="e.g., bartowski, unsloth"
                  value={getFieldValue("quantSource")}
                  onInput={(e) => updateField("quantSource", e.currentTarget.value || undefined)}
                />
              </div>
            </div>
            <Show when={selectedModel()}>
              <p class="submit-hint">
                Find quantizations on{" "}
                <a
                  href={`https://huggingface.co/models?search=${selectedModel()!.id.split("/")[1]} GGUF`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="link"
                >
                  HuggingFace
                </a>
              </p>
            </Show>
          </Section>

          <Section card title="Command">
            <div class="submit-field submit-field--full">
              <Textarea
                id="command"
                placeholder="Paste your llama.cpp command here..."
                value={getFieldValue("command")}
                onInput={(e) => updateField("command", e.currentTarget.value || undefined)}
                onPaste={handleCommandPaste}
                rows={4}
                class="command-input"
              />
              <Show when={parsed()}>
                <div class="parsed-feedback fade-in">
                  <Check size={14} />
                  Command parsed - fields auto-filled
                </div>
              </Show>
              <Show when={!parsed()}>
                <p class="submit-parse-hint">
                  Paste a llama.cpp command to auto-fill form fields, or{" "}
                  <button type="button" onClick={parseCommand} class="link">
                    parse manually
                  </button>
                </p>
              </Show>
            </div>
          </Section>

          <Section card title="Quick Info">
            <div class="submit-grid submit-grid--2col">
              <div class="submit-field submit-field--full">
                <label for="title" class="submit-label">
                  Title *
                </label>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g., RTX 4090 with Q4_K_M"
                  value={getFieldValue("title")}
                  onInput={(e) => updateField("title", e.currentTarget.value || undefined)}
                  error={hasError("title")}
                />
                <Show when={getError("title")}>
                  <p class="submit-error">{getError("title")}</p>
                </Show>
              </div>
              <For each={QUICK_FIELDS}>
                {(field) => (
                  <div class="submit-field">
                    <label for={field.name} class="submit-label">
                      {field.label}
                    </label>
                    <Input
                      id={field.name}
                      type={field.type}
                      placeholder={field.placeholder}
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
                      error={hasError(field.name)}
                    />
                    <Show when={getError(field.name)}>
                      <p class="submit-error">{getError(field.name)}</p>
                    </Show>
                  </div>
                )}
              </For>
            </div>
          </Section>

          <Section card>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              class={`advanced-toggle ${showAdvanced() ? "advanced-toggle--open" : ""}`}
            >
              <ChevronRight size={14} class="advanced-toggle-icon" />
              {showAdvanced() ? "Hide" : "Show"} all options
            </button>

            <div class={`advanced-content ${showAdvanced() ? "advanced-content--open" : ""}`}>
              <For each={ADVANCED_SECTIONS}>
                {(section) => (
                  <div class="submit-section">
                    <h3 class="submit-section-title">{section.title}</h3>
                    <div class="submit-grid submit-grid--2col">
                      <For each={section.fields}>
                        {(field) => (
                          <div class="submit-field">
                            <label for={field.name} class="submit-label">
                              {field.label}
                              {REQUIRED_FIELDS.includes(
                                field.name as (typeof REQUIRED_FIELDS)[number],
                              ) && " *"}
                            </label>
                            <Input
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
                              error={hasError(field.name)}
                            />
                            <Show when={getError(field.name)}>
                              <p class="submit-error">{getError(field.name)}</p>
                            </Show>
                          </div>
                        )}
                      </For>
                    </div>
                  </div>
                )}
              </For>

              <div class="submit-section">
                <h3 class="submit-section-title">Description</h3>
                <div class="submit-field submit-field--full">
                  <Textarea
                    id="description"
                    placeholder="Optional notes about this configuration..."
                    value={getFieldValue("description")}
                    onInput={(e) => updateField("description", e.currentTarget.value || undefined)}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </Section>

          <Section card title="Verification">
            <Turnstile onVerify={setTurnstileToken} />
            <Show when={errors().turnstile}>
              <p class="submit-error">{errors().turnstile}</p>
            </Show>
          </Section>

          <Show when={errors().submit}>
            <div class="card submit-error-box">
              <p class="submit-error">{errors().submit}</p>
            </div>
          </Show>

          <Button type="submit" disabled={submitting()} variant="primary" size="lg" block>
            <Show when={submitting()} fallback="Submit Configuration">
              <Loader2 size={16} class="icon--spin" />
              Submitting...
            </Show>
          </Button>
        </form>
      </Show>
    </Layout>
  );
}
