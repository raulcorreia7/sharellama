export const TRENDING_MODELS = [
  { slug: "meta-llama/Llama-3.2-3B-Instruct", name: "Llama 3.2 3B Instruct", org: "meta-llama" },
  { slug: "Qwen/Qwen2.5-7B-Instruct", name: "Qwen2.5 7B Instruct", org: "Qwen" },
  {
    slug: "mistralai/Mistral-7B-Instruct-v0.3",
    name: "Mistral 7B Instruct v0.3",
    org: "mistralai",
  },
  { slug: "google/gemma-2-9b-it", name: "Gemma 2 9B IT", org: "google" },
  { slug: "microsoft/Phi-3.5-mini-instruct", name: "Phi 3.5 Mini Instruct", org: "microsoft" },
];

export const FIRST_MODEL = TRENDING_MODELS[0]!;
export const SECOND_MODEL = TRENDING_MODELS[1]!;

export function createTestSubmission(
  overrides: Partial<{
    title: string;
    description: string;
    modelSlug: string;
    runtime: string;
    runtimeVersion: string;
    quantization: string;
    gpu: string;
    cpu: string;
    ramGb: number;
    vramGb: number;
    tokensPerSecond: number;
    score: number;
    authorHash: string;
    editToken: string;
  }> = {},
) {
  return {
    title: overrides.title ?? "Test Configuration",
    description: overrides.description ?? "A test configuration",
    modelSlug: overrides.modelSlug ?? FIRST_MODEL.slug,
    runtime: overrides.runtime ?? "llama.cpp",
    runtimeVersion: overrides.runtimeVersion ?? "b4000",
    quantization: overrides.quantization ?? "Q4_K_M",
    gpu: overrides.gpu ?? "RTX 4090",
    cpu: overrides.cpu ?? "Ryzen 9 7950X",
    ramGb: overrides.ramGb ?? 64,
    vramGb: overrides.vramGb ?? 24,
    tokensPerSecond: overrides.tokensPerSecond ?? 50.5,
    score: overrides.score ?? 0,
    authorHash: overrides.authorHash ?? "test-author-hash",
    editToken: overrides.editToken ?? "test-edit-token",
    updatedAt: new Date(),
  };
}

export function createTestModel(
  overrides: Partial<{
    slug: string;
    name: string;
    org: string;
    configCount: number;
  }> = {},
) {
  const base = overrides.slug
    ? (TRENDING_MODELS.find((m) => m.slug === overrides.slug) ?? FIRST_MODEL)
    : FIRST_MODEL;
  return {
    slug: overrides.slug ?? base.slug,
    name: overrides.name ?? base.name,
    org: overrides.org ?? base.org,
    configCount: overrides.configCount ?? 0,
  };
}
