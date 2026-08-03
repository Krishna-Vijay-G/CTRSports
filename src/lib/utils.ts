import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * A short name for a post in places that need words rather than a layout —
 * aria-labels, admin lists, live regions. Title and subtext are both optional,
 * so this falls back down the chain and finally to a generic label.
 */
export function postLabel(
  post: { title: string | null; subtext: string },
  fallback = "Untitled post"
): string {
  if (post.title?.trim()) return post.title.trim();

  const firstLine = post.subtext.split("\n").find((line) => line.trim());
  if (!firstLine) return fallback;

  const trimmed = firstLine.trim();
  return trimmed.length > 70 ? `${trimmed.slice(0, 69)}…` : trimmed;
}
