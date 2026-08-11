/**
 * The rules every stored document is read through.
 *
 * Content comes out of a JSONB column, which means it can be anything: written
 * by an older version of the app, half-edited, or simply absent. Nothing in this
 * project trusts that shape — every field is put through one of these on the way
 * in AND on the way out, so a bad document degrades one field at a time rather
 * than taking a page down.
 *
 * These used to be copied into each content module. They are here so the rules
 * are the same everywhere: one definition of "is this a usable image", one of
 * "is this a safe link".
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

export const SHORT_MAX = 240;
export const BODY_MAX = 3000;
export const URL_MAX = 600;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Empty is allowed — clearing a line of copy is a real editorial choice, and the
 * components already skip what is blank. Only a MISSING or wrong-typed field
 * falls back.
 */
export function text(value: unknown, fallback: string, max = SHORT_MAX): string {
  return typeof value === "string" ? value.slice(0, max).trim() : fallback;
}

/** The same, where there is nothing sensible to fall back to. */
export function optionalText(value: unknown, max = SHORT_MAX): string {
  return text(value, "", max);
}

export function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Images are the exception to "empty is allowed": an empty src renders as a
 * broken image, so a blank or unusable one falls back. A leading-slash path
 * points at /public; anything else must be http(s), which is what keeps a
 * `javascript:` payload out of an <img src>.
 */
export function image(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, URL_MAX);
  if (!trimmed || trimmed.startsWith("//")) return fallback;
  return trimmed.startsWith("/") || isHttpUrl(trimmed) ? trimmed : fallback;
}

/** Same rule as an image, plus in-page anchors, which is what most CTAs are. */
export function link(value: unknown, fallback: string): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim().slice(0, URL_MAX);
  if (!trimmed) return fallback;
  if (trimmed.startsWith("#") || trimmed.startsWith("/")) return trimmed;
  return isHttpUrl(trimmed) ? trimmed : fallback;
}

/**
 * A value from a fixed set, or the fallback.
 *
 * This is what makes retiring an option safe: a document still holding the old
 * one reads back as the fallback with no migration and no write.
 */
export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value as string) ? (value as T) : fallback;
}

/**
 * A list of objects.
 *
 * An empty list is kept — removing every card is a real choice. Only a MISSING
 * or wrong-typed list falls back to the defaults, which is what stops a document
 * saved by an older version from rendering a section with nothing in it.
 */
export function list<T>(
  value: unknown,
  max: number,
  map: (entry: Record<string, unknown>, index: number) => T,
  fallback: T[]
): T[] {
  if (!Array.isArray(value)) return fallback.map((entry) => ({ ...entry }));
  return value.filter(isRecord).slice(0, max).map(map);
}

/** A list of plain strings — marquee items, and nothing else so far. */
export function lines(value: unknown, max: number, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .slice(0, max)
    .map((entry) => entry.slice(0, SHORT_MAX).trim())
    .filter(Boolean);
}
