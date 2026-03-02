import { createResource, For, Show } from "solid-js";
import { Title } from "@solidjs/meta";
import { useParams } from "@solidjs/router";

import { Download, ExternalLink, Heart } from "lucide-solid";

import { Breadcrumbs, EmptyState, Layout, LoadingState, Section } from "../../components/layout";
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

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Models", href: "/models" },
          { label: modelName() },
        ]}
      />

      <Show when={model.error}>
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

      <Show when={!model.error}>
        <div
          style={{
            display: "flex",
            "align-items": "center",
            gap: "0.75rem",
            "margin-bottom": "1rem",
          }}
        >
          <Show when={model() && model()!.data.orgAvatar}>
            <img
              src={model()!.data.orgAvatar!}
              alt={orgName()!}
              style={{
                width: "2.5rem",
                height: "2.5rem",
                "border-radius": "50%",
                "object-fit": "cover",
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </Show>
          <div>
            <h1 style={{ "font-size": "1.5rem", "font-weight": "700", margin: 0 }}>
              {modelName()}
            </h1>
            <Show when={orgName()}>
              <p class="text-muted" style={{ margin: "0.25rem 0 0", "font-size": "0.875rem" }}>
                by {orgName()}
              </p>
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

        <Show when={model.loading}>
          <Section>
            <LoadingState message="Loading model information..." />
          </Section>
        </Show>

        <Show when={!model.loading && model()}>
          {(m) => (
            <>
              <Section
                card
                title="HuggingFace"
                iconUrl="https://huggingface.co/front/assets/huggingface_logo-noborder.svg"
              >
                <a
                  href={`https://huggingface.co/${m().data.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="link flex items-center gap-2 text-lg font-medium"
                >
                  <ExternalLink size={20} />
                  huggingface.co/{m().data.slug}
                </a>
                <p class="section-hint">
                  View model details, files, and documentation on HuggingFace.
                </p>
              </Section>

              <Show when={m().configurations.length > 0}>
                <Section title="Configurations">
                  <div
                    style={{
                      display: "grid",
                      gap: "1rem",
                      "grid-template-columns": "repeat(auto-fill, minmax(320px, 1fr))",
                    }}
                  >
                    <For each={m().configurations}>
                      {(config) => <SubmissionCard submission={config} />}
                    </For>
                  </div>
                </Section>
              </Show>

              <Show when={m().configurations.length === 0}>
                <EmptyState
                  message="No configurations have been submitted for this model yet."
                  action={
                    <a href="/submit">
                      <button type="button" class="btn btn--primary">
                        Submit Configuration
                      </button>
                    </a>
                  }
                />
              </Show>
            </>
          )}
        </Show>
      </Show>
    </Layout>
  );
}
