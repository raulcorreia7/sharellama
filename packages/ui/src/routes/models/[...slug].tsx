import { createMemo, createResource, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";

import { Download, ExternalLink, Heart } from "lucide-solid";

import { Breadcrumbs, EmptyState, Layout, LoadingState, Section } from "../../components/layout";
import { SpecsGrid } from "../../components/display/SpecsGrid";
import { VramCard } from "../../components/display/VramCard";
import { PresetTabs } from "../../components/display/PresetTabs";
import { CommandBlock } from "../../components/display/CommandBlock";
import { CommunityRefs } from "../../components/display/CommunityRefs";
import { SubmissionCard } from "../../components/SubmissionCard";
import { api } from "../../lib/api";

function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return String(num);
}

export default function ModelDetail() {
  const params = useParams();
  const slug = () => {
    const slugParam = params.slug;
    if (Array.isArray(slugParam)) {
      return slugParam.join("/");
    }
    return slugParam ?? "";
  };

  const modelResource = createResource(slug, async (s) => {
    const result = await api.getModel(s);
    return result;
  });
  const model = modelResource[0];
  const { refetch } = modelResource[1];

  const specsResource = createResource(slug, async (s) => {
    const result = await api.getModelSpecs(s);
    return result.data;
  });
  const specs = specsResource[0];
  const primarySpec = createMemo(() => specs()?.find((s) => s.isPrimary) || specs()?.[0]);

  const isLoading = () => model.loading || !model();
  const hasError = () => !!model.error;
  const hasData = () => !isLoading() && !hasError() && model();

  const modelName = () => {
    const m = model();
    if (!m) return slug().split("/").pop() || slug();
    return m.data.name || m.data.slug.split("/").pop() || m.data.slug;
  };

  const orgName = () => {
    const m = model();
    if (!m) return null;
    return m.data.org || m.data.slug.split("/")[0] || null;
  };

  const pageTitle = () => {
    const name = modelName();
    return `ShareLlama - ${name}`;
  };

  return (
    <Layout>
      <Title>{pageTitle()}</Title>

      <Show when={isLoading()}>
        <div class="page-loading-overlay">
          <LoadingState message="Loading model information..." />
        </div>
      </Show>

      <Show when={!isLoading() && hasError()}>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Models", href: "/models" },
            { label: modelName() },
          ]}
        />
        <EmptyState
          message="Unable to load this model. It may not exist or there's a connection issue."
          action={
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={() => refetch()} class="btn btn--secondary">
                Try Again
              </button>
              <a href="/models">
                <button type="button" class="btn btn--ghost">
                  Browse Models
                </button>
              </a>
            </div>
          }
        />
      </Show>

      <Show when={hasData()}>
        <div class="fade-in-content">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Models", href: "/models" },
              { label: modelName() },
            ]}
          />

          <div class="model-detail-header">
            <Show when={model() && model()!.data.orgAvatar}>
              <img
                src={model()!.data.orgAvatar!}
                alt={orgName()!}
                class="model-org-avatar"
                style={{ width: "2rem", height: "2rem" }}
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            </Show>
            <div class="model-title-wrapper">
              <h1 class="model-detail-title">{modelName()}</h1>
              <Show when={orgName()}>
                <p class="model-detail-org">by {orgName()}</p>
              </Show>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              "align-items": "center",
              gap: "0.75rem",
              "margin-bottom": "1.5rem",
              "flex-wrap": "wrap",
            }}
          >
            <Show when={model()}>
              <span class="tag">{model()!.data.configCount} configs</span>
              <Show when={model()!.hfMetadata}>
                <span
                  class="tag"
                  style={{ "align-items": "center", display: "flex", gap: "0.375rem" }}
                >
                  <Download size={14} />
                  {formatNumber(model()!.hfMetadata!.downloads)}
                </span>
                <span
                  class="tag"
                  style={{ "align-items": "center", display: "flex", gap: "0.375rem" }}
                >
                  <Heart size={14} />
                  {formatNumber(model()!.hfMetadata!.likes)}
                </span>
              </Show>
            </Show>
          </div>

          <Section
            card
            title="HuggingFace"
            iconUrl="https://huggingface.co/front/assets/huggingface_logo-noborder.svg"
          >
            <a
              href={`https://huggingface.co/${model()!.data.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              class="link flex items-center gap-2 text-lg font-medium"
            >
              <ExternalLink size={20} />
              huggingface.co/{model()!.data.slug}
            </a>
            <p class="section-hint">View model details, files, and documentation on HuggingFace.</p>
          </Section>

          <Show when={primarySpec()}>
            <Section card title="Architecture">
              <SpecsGrid
                architecture={primarySpec()!.architecture}
                parameterCount={primarySpec()!.parameterCount}
                activeParameters={primarySpec()!.activeParameters}
                layers={primarySpec()!.layers}
                hiddenSize={primarySpec()!.hiddenSize}
                attentionHeads={primarySpec()!.attentionHeads}
                contextWindow={primarySpec()!.contextWindow}
                attentionType={primarySpec()!.attentionType}
                multimodal={primarySpec()!.multimodal}
              />
            </Section>
          </Show>

          <Show when={primarySpec()}>
            <Section card title="VRAM Requirements">
              <div
                style={{
                  display: "grid",
                  "grid-template-columns": "repeat(auto-fill, minmax(250px, 1fr))",
                  gap: "1rem",
                }}
              >
                <VramCard
                  quant="Q4_K_M"
                  vram={primarySpec()!.minVramQ4}
                  recommendedGpu={primarySpec()!.recommendedGpu}
                />
                <VramCard quant="Q6_K" vram={primarySpec()!.minVramQ6} />
                <VramCard quant="Q8_0" vram={primarySpec()!.minVramQ8} />
              </div>
            </Section>
          </Show>

          <Show when={primarySpec()}>
            <Section card title="Running Commands">
              <div style={{ display: "flex", "flex-direction": "column", gap: "1rem" }}>
                <CommandBlock engine="llama.cpp" command={primarySpec()!.llamaCppCommand} />
                <Show when={primarySpec()!.vllmCommand}>
                  <CommandBlock engine="vLLM" command={primarySpec()!.vllmCommand} />
                </Show>
                <Show when={primarySpec()!.ollamaModelfile}>
                  <CommandBlock
                    engine="Ollama"
                    command={primarySpec()!.ollamaModelfile}
                    modelfile
                  />
                </Show>
              </div>
            </Section>
          </Show>

          <Show when={primarySpec()}>
            <Section card title="Generation Presets">
              <PresetTabs
                defaultParams={primarySpec()!.defaultParams}
                thinkingModeParams={primarySpec()!.thinkingModeParams}
              />
            </Section>
          </Show>

          <Show when={primarySpec()}>
            <Section card title="Community Discussions">
              <CommunityRefs
                redditPosts={primarySpec()!.redditPosts}
                sourceUrl={primarySpec()!.sourceUrl}
              />
            </Section>
          </Show>

          <Show when={model()!.configurations.length > 0}>
            <Section title="Configurations">
              <div
                style={{
                  display: "grid",
                  gap: "1rem",
                  "grid-template-columns": "repeat(auto-fill, minmax(320px, 1fr))",
                }}
              >
                <For each={model()!.configurations}>
                  {(config) => <SubmissionCard submission={config} />}
                </For>
              </div>
            </Section>
          </Show>

          <Show when={model()!.configurations.length === 0}>
            <EmptyState
              message="No configurations have been submitted for this model yet."
              action={
                <a href="/submit">
                  <button type="button" class="btn btn--primary">
                    Submit
                  </button>
                </a>
              }
            />
          </Show>
        </div>
      </Show>
    </Layout>
  );
}
