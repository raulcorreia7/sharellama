import { createSignal, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { A, useLocation, useParams } from "@solidjs/router";

import { type CreateModelSpecInput } from "@sharellama/model";

import { Button } from "../../../components/display";
import { Input, Textarea } from "../../../components/forms";
import { Check, Loader2 } from "../../../components/icons";
import { Breadcrumbs, Layout, Section } from "../../../components/layout";
import { api } from "../../../lib/api";

export default function SubmitSpecPage() {
  const params = useParams();
  const location = useLocation();
  const slug = () => {
    const slugParam = params.slug;
    if (Array.isArray(slugParam)) {
      return slugParam.join("/");
    }
    if (typeof slugParam === "string" && slugParam.length > 0) {
      return slugParam;
    }

    const pathname = decodeURIComponent(location.pathname);
    const prefix = "/models/submit-spec/";
    if (!pathname.startsWith(prefix)) {
      return "";
    }
    return pathname.slice(prefix.length);
  };

  const [formData, setFormData] = createSignal<Partial<CreateModelSpecInput>>({});
  const [submitting, setSubmitting] = createSignal(false);
  const [success, setSuccess] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const SECTIONS = [
    {
      title: "Basic Info",
      fields: [
        {
          name: "sourceType",
          label: "Source Type",
          type: "select",
          options: ["hf_readme", "user_submit", "unsloth", "official", "reddit"],
        },
        {
          name: "sourceUrl",
          label: "Source URL",
          type: "url",
          placeholder: "https://...",
        },
      ] as const,
    },
    {
      title: "Architecture",
      fields: [
        {
          name: "architecture",
          label: "Architecture",
          type: "select",
          options: ["Dense", "MoE", "Hybrid"],
        },
        {
          name: "parameterCount",
          label: "Parameter Count",
          type: "text",
          placeholder: "e.g., 35B",
        },
        {
          name: "activeParameters",
          label: "Active Parameters",
          type: "text",
          placeholder: "e.g., 3.5B",
        },
        { name: "layers", label: "Layers", type: "number", placeholder: "e.g., 32" },
        { name: "hiddenSize", label: "Hidden Size", type: "number", placeholder: "e.g., 4096" },
        {
          name: "attentionHeads",
          label: "Attention Heads",
          type: "number",
          placeholder: "e.g., 32",
        },
        {
          name: "contextWindow",
          label: "Context Window",
          type: "number",
          placeholder: "e.g., 262144",
        },
        {
          name: "attentionType",
          label: "Attention Type",
          type: "text",
          placeholder: "e.g., Hybrid Gated DeltaNet",
        },
      ] as const,
    },
    {
      title: "VRAM Requirements",
      fields: [
        { name: "minVramQ4", label: "Min VRAM (Q4)", type: "number", placeholder: "GB" },
        { name: "minVramQ6", label: "Min VRAM (Q6)", type: "number", placeholder: "GB" },
        { name: "minVramQ8", label: "Min VRAM (Q8)", type: "number", placeholder: "GB" },
        {
          name: "recommendedGpu",
          label: "Recommended GPU",
          type: "text",
          placeholder: "e.g., RTX 4090",
        },
      ] as const,
    },
    {
      title: "Generation Presets",
      fields: [
        {
          name: "defaultParams",
          label: "Default Params (JSON)",
          type: "textarea",
          placeholder: '{"temp": 0.7, "topP": 0.9}',
        },
        {
          name: "thinkingModeParams",
          label: "Thinking Mode Params (JSON)",
          type: "textarea",
          placeholder: '{"temp": 0.5, "topP": 0.95}',
        },
      ] as const,
    },
    {
      title: "Commands",
      fields: [
        {
          name: "llamaCppCommand",
          label: "llama.cpp Command",
          type: "textarea",
          placeholder: "llama-cli -m model.gguf ...",
        },
        {
          name: "vllmCommand",
          label: "vLLM Command",
          type: "textarea",
          placeholder: "vllm serve model ...",
        },
        {
          name: "ollamaModelfile",
          label: "Ollama Modelfile",
          type: "textarea",
          placeholder: "FROM model\nPARAMETER temperature 0.7",
        },
      ] as const,
    },
  ] as const;

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await api.submitModelSpec(slug(), formData());
      setSuccess(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <Title>ShareLlama - Submit Model Specs</Title>

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Models", href: "/models" },
          { label: slug().split("/").pop() || "", href: `/models/${slug()}` },
          { label: "Submit Specs" },
        ]}
      />

      <Show
        when={!success()}
        fallback={
          <div class="submit-success">
            <div class="submit-success-header">
              <div class="submit-success-icon">
                <Check size={24} />
              </div>
              <div>
                <h2 class="submit-success-title">Specs Submitted!</h2>
                <p class="submit-success-text">Thank you for contributing model specifications.</p>
              </div>
            </div>
            <div class="submit-actions">
              <A href={`/models/${slug()}`}>
                <Button>Back to Model</Button>
              </A>
            </div>
          </div>
        }
      >
        <div class="page-header--simple">
          <h1>Submit Model Specifications</h1>
          <p>Share technical specifications for {slug()}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <For each={SECTIONS}>
            {(section) => (
              <Section card title={section.title}>
                <div class="submit-grid submit-grid--3col">
                  <For each={section.fields}>
                    {(field) => (
                      <div class="submit-field">
                        <label class="submit-label">{field.label}</label>
                        {field.type === "select" ? (
                          <select
                            class="input"
                            value={formData()[field.name] || ""}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                [field.name]: e.currentTarget.value,
                              }))
                            }
                          >
                            <option value="">Select...</option>
                            <For each={field.options}>
                              {(opt) => <option value={opt}>{opt}</option>}
                            </For>
                          </select>
                        ) : field.type === "textarea" ? (
                          <Textarea
                            rows={
                              field.name.includes("Command") || field.name.includes("Params")
                                ? 4
                                : 2
                            }
                            placeholder={field.placeholder}
                            value={String(formData()[field.name] || "")}
                            onInput={(e) => {
                              const val = e.currentTarget.value;
                              setFormData((prev) => ({
                                ...prev,
                                [field.name]: field.name.includes("Params")
                                  ? JSON.parse(val || "{}")
                                  : val,
                              }));
                            }}
                          />
                        ) : (
                          <Input
                            type={field.type}
                            placeholder={field.placeholder}
                            value={String(formData()[field.name] || "")}
                            onInput={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                [field.name]:
                                  field.type === "number"
                                    ? Number(e.currentTarget.value)
                                    : e.currentTarget.value,
                              }))
                            }
                          />
                        )}
                      </div>
                    )}
                  </For>
                </div>
              </Section>
            )}
          </For>

          <Show when={error()}>
            <div class="card submit-error-box">
              <p class="submit-error">{error()}</p>
            </div>
          </Show>

          <Button type="submit" disabled={submitting()} variant="primary" size="lg" block>
            {submitting() ? (
              <>
                <Loader2 size={16} class="icon--spin" /> Submitting...
              </>
            ) : (
              "Submit Specifications"
            )}
          </Button>
        </form>
      </Show>
    </Layout>
  );
}
