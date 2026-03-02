import { For, JSX, splitProps } from "solid-js";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
}

export function Select(props: SelectProps) {
  const [local, rest] = splitProps(props, ["options", "class", "children"]);

  return (
    <select class={`select ${local.class || ""}`} {...rest}>
      {local.children}
      <For each={local.options}>
        {(option) => <option value={option.value}>{option.label}</option>}
      </For>
    </select>
  );
}
