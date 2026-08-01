import type { PostInput } from "@/lib/posts";

export type ValidationResult =
  | { ok: true; value: PostInput }
  | { ok: false; error: string };

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Only http(s) — blocks `javascript:` and friends from reaching an href/src. */
function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validatePostBody(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body." };
  }

  const raw = body as Record<string, unknown>;

  const title = asString(raw.title);
  if (!title) return { ok: false, error: "Title is required." };
  if (title.length > 200) return { ok: false, error: "Title must be 200 characters or fewer." };

  const subtext = asString(raw.subtext);
  if (subtext.length > 2000) {
    return { ok: false, error: "Subtext must be 2000 characters or fewer." };
  }

  const imageUrl = asString(raw.image_url);
  if (!imageUrl) return { ok: false, error: "An image is required — upload one or paste a URL." };
  // Relative paths point at /public assets and are safe; anything else must be http(s).
  if (!imageUrl.startsWith("/") && !isSafeHttpUrl(imageUrl)) {
    return { ok: false, error: "Image URL must start with http://, https:// or /." };
  }

  const instagramRaw = asString(raw.instagram_url);
  if (instagramRaw && !isSafeHttpUrl(instagramRaw)) {
    return { ok: false, error: "Instagram link must be a full http:// or https:// URL." };
  }

  const publishedRaw = asString(raw.published_at);
  const publishedAt = publishedRaw ? new Date(publishedRaw) : new Date();
  if (Number.isNaN(publishedAt.getTime())) {
    return { ok: false, error: "Date and time is not a valid date." };
  }

  return {
    ok: true,
    value: {
      title,
      subtext,
      image_url: imageUrl,
      image_key: asString(raw.image_key) || null,
      instagram_url: instagramRaw || null,
      published_at: publishedAt.toISOString(),
      is_published: raw.is_published === undefined ? true : Boolean(raw.is_published),
    },
  };
}
