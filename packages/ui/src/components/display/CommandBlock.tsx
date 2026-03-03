import { createSignal, Show } from "solid-js";

import { Check, Copy } from "../icons";

export interface CommandBlockProps {
  engine: "llama.cpp" | "vLLM" | "Ollama";
  command?: string | null;
  modelfile?: boolean;
  copyable?: boolean;
}

export function CommandBlock(props: CommandBlockProps) {
  const [copied, setCopied] = createSignal(false);

  const engineColors = {
    "llama.cpp": "command-engine--llama",
    vLLM: "command-engine--vllm",
    Ollama: "command-engine--ollama",
  };

  const copyToClipboard = async () => {
    if (props.command) {
      await navigator.clipboard.writeText(props.command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div class="command-block">
      <div class="command-header">
        <span class={`command-engine ${engineColors[props.engine]}`}>{props.engine}</span>
        <Show when={props.copyable !== false}>
          <button type="button" class="command-copy" onClick={copyToClipboard} title="Copy command">
            <Show
              when={copied()}
              fallback={
                <>
                  Copy <Copy size={16} />
                </>
              }
            >
              Copied! <Check size={16} />
            </Show>
          </button>
        </Show>
      </div>
      <pre class={`command-code ${props.modelfile ? "modelfile" : ""}`}>
        <code>{props.command || "No command available"}</code>
      </pre>
    </div>
  );
}
