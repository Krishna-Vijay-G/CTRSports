import { MARQUEE_TEXT_MAX, MAX_MARQUEE_ITEMS, type MarqueeItem } from "@/lib/marquee";

export type ValidationResult =
  | { ok: true; value: MarqueeItem[] }
  | { ok: false; error: string };

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Only http(s) or a leading-slash path — blocks `javascript:` and friends from reaching an href. */
function isUsableUrl(value: string): boolean {
  if (value.startsWith("/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

let counter = 0;
/** A stable-enough id for an item the client sent without one. */
function fallbackId(): string {
  counter += 1;
  return `item-${Date.now()}-${counter}`;
}

export function validateMarqueeBody(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const rawItems = (body as Record<string, unknown>).items;
  if (!Array.isArray(rawItems)) {
    return { ok: false, error: "Expected a list of announcements." };
  }
  if (rawItems.length > MAX_MARQUEE_ITEMS) {
    return { ok: false, error: `A page can have at most ${MAX_MARQUEE_ITEMS} announcements.` };
  }

  const items: MarqueeItem[] = [];
  const seenIds = new Set<string>();

  for (const raw of rawItems) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "Invalid announcement." };
    }
    const entry = raw as Record<string, unknown>;

    const text = asString(entry.text);
    if (!text) return { ok: false, error: "Every announcement needs text." };
    if (text.length > MARQUEE_TEXT_MAX) {
      return { ok: false, error: `Announcement text must be ${MARQUEE_TEXT_MAX} characters or fewer.` };
    }

    const url = asString(entry.url);
    if (url && !isUsableUrl(url)) {
      return { ok: false, error: "Announcement links must start with http://, https:// or /." };
    }

    let id = asString(entry.id);
    if (!id || seenIds.has(id)) id = fallbackId();
    seenIds.add(id);

    items.push({ id, text, url: url || null });
  }

  return { ok: true, value: items };
}
