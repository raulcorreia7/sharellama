import { Title } from "@solidjs/meta";
import { createResource, Show, Suspense, For } from "solid-js";
import { useParams } from "@solidjs/router";
import { ExternalLink } from "lucide-solid";
import { api } from "../../lib/api";
import {
  Layout,
  Breadcrumbs,
  PageHeader,
  Section,
  EmptyState,
  LoadingState,
} from "../../components/layout";
import { SubmissionCard } from "../../components/SubmissionCard";

export default function ModelDetail() {
  const params = useParams();
  const slug = () => params.slug ?? "";

  const modelResource = createResource(slug, (s) => api.getModel(s));
  const model = modelResource[0];
  const { refetch } = modelResource[1];

  const modelName = () => {
    const m = model();
    if (!m) return slug();
    return m.data.name || m.data.slug.split("/").pop() || m.data.slug;
  };

  const orgName = () => {
    const m = model();
    if (!m) return null;
    return m.data.org || m.data.slug.split("/")[0] || null;
  };

  return (
    <Layout>
      <Title>
        <Suspense>{modelName()} - ShareLlama</Suspense>
      </Title>

      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Models", href: "/submissions" },
          { label: modelName() },
        ]}
      />

      <Show when={model.loading}>
        <LoadingState />
      </Show>

      <Show when={model.error}>
        <EmptyState
          message="Unable to load this model. It may not exist or there's a connection issue."
          action={
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="button" onClick={() => refetch()} class="btn btn--secondary">
                Try Again
              </button>
              <a href="/submissions">
                <button type="button" class="btn btn--ghost">
                  Browse All
                </button>
              </a>
            </div>
          }
        />
      </Show>

      <Show when={model()}>
        {(m) => (
          <>
            <PageHeader
              title={m().data.name || m().data.slug.split("/").pop() || m().data.slug}
              actions={
                <div style={{ display: "flex", "align-items": "center", gap: "0.75rem" }}>
                  <Show when={orgName() && orgName() !== m().data.slug.split("/").pop()}>
                    <span class="text-muted" style={{ "font-size": "0.875rem" }}>
                      by {orgName()}
                    </span>
                  </Show>
                  <span class="tag">{m().data.configCount} configs</span>
                </div>
              }
            />

            <Section card title="HuggingFace">
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
    </Layout>
  );
}
