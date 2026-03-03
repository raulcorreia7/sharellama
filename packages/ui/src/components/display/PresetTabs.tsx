import { createMemo, createSignal, For } from "solid-js";

import { Copy } from "../icons";

export interface PresetTabsProps {
  defaultParams?: { temp?: number; topP?: number; topK?: number; minP?: number } | null;
  thinkingModeParams?: { temp?: number; topP?: number; topK?: number; minP?: number } | null;
}

const BUILTIN_PRESETS = {
  code: { name: "Code", temp: 0.2, topP: 0.9, topK: 40, minP: 0.0 },
  creative: { name: "Creative", temp: 0.8, topP: 0.95, topK: 50, minP: 0.0 },
  chat: { name: "Chat", temp: 0.6, topP: 0.9, topK: 20, minP: 0.0 },
} as const;

type TabType = "default" | "thinking" | "code" | "creative";

function copyParams(params: { temp: number; topP: number; topK: number; minP?: number }) {
  const text = `--temp ${params.temp} --top-p ${params.topP} --top-k ${params.topK}`;
  navigator.clipboard.writeText(text);
}

interface ParamItemProps {
  label: string;
  value: number | undefined;
}

function ParamItem(props: ParamItemProps) {
  return (
    <div class="preset-param-item">
      <span class="preset-param-label">{props.label}</span>
      <span class="preset-param-value">{props.value?.toFixed(2)}</span>
    </div>
  );
}

export function PresetTabs(props: PresetTabsProps) {
  const [activeTab, setActiveTab] = createSignal<TabType>("default");
  const [copied, setCopied] = createSignal(false);

  const getParams = () => {
    const tab = activeTab();
    switch (tab) {
      case "thinking":
        return props.thinkingModeParams || BUILTIN_PRESETS.chat;
      case "code":
        return BUILTIN_PRESETS.code;
      case "creative":
        return BUILTIN_PRESETS.creative;
      default:
        return props.defaultParams || BUILTIN_PRESETS.chat;
    }
  };

  const params = createMemo(() => getParams());

  const handleCopy = () => {
    const p = params();
    copyParams({ temp: p.temp ?? 0.7, topP: p.topP ?? 0.9, topK: p.topK ?? 40, minP: p.minP ?? 0 });
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="preset-tabs">
      <div class="preset-tab-list">
        <For each={["default", "thinking", "code", "creative"] as TabType[]}>
          {(tab) => (
            <button
              type="button"
              class={`preset-tab ${activeTab() === tab ? "preset-tab--active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          )}
        </For>
      </div>

      <div class="preset-content">
        <div class="preset-params">
          <ParamItem label="Temperature" value={params().temp} />
          <ParamItem label="Top P" value={params().topP} />
          <ParamItem label="Top K" value={params().topK} />
          {params().minP !== undefined && <ParamItem label="Min P" value={params().minP} />}
        </div>
        <button
          type="button"
          class="btn btn--icon preset-copy-btn"
          title={copied() ? "Copied!" : "Copy parameters"}
          onClick={handleCopy}
        >
          <Copy size={16} />
        </button>
      </div>
    </div>
  );
}
