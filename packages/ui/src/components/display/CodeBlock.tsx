export interface CodeBlockProps {
  code: string;
  language?: string;
  class?: string;
}

export function CodeBlock(props: CodeBlockProps) {
  return (
    <pre class={`section-code ${props.class || ""}`}>
      <code>{props.code}</code>
    </pre>
  );
}
