/**
 * Format a date string or Date object as a relative time (e.g., "5m ago", "2h ago")
 * @param date - The date to format (null/undefined returns "never")
 * @returns Human-readable relative time string
 */
export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "never";

  const now = new Date();
  const then = date instanceof Date ? date : new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }

  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}
