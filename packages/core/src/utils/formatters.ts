/**
 * Format a number with K/M suffixes for readability
 * @param count - The number to format
 * @returns Formatted string (e.g., "1.5K", "2.3M")
 */
export function formatNumber(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`;
  }
  return String(count);
}

/**
 * Extract and format model name from full model ID
 * @param modelId - Full model ID (e.g., "meta-llama/Llama-3-8B")
 * @returns Formatted model name (e.g., "Llama-3-8B")
 */
export function formatModelName(modelId: string): string {
  const parts = modelId.split("/");
  return parts.length > 1 ? parts[1]! : modelId;
}
