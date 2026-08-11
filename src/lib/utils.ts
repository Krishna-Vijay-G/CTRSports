import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes without the later one silently losing to the earlier. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
