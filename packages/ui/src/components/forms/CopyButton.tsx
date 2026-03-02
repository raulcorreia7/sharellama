import { createSignal, Show } from "solid-js";

import { Button } from "../display/Button";
import { Check, Copy } from "../icons";

export interface CopyButtonProps {
  text: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export function CopyButton(props: CopyButtonProps) {
  const [copied, setCopied] = createSignal(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(props.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      type="button"
      onClick={handleCopy}
      variant={copied() ? "primary" : "secondary"}
      size={props.size || "sm"}
    >
      <Show when={copied()} fallback={props.label ?? <Copy size={14} />}>
        <Check size={14} />
        {props.label ? " Copied" : ""}
      </Show>
    </Button>
  );
}
