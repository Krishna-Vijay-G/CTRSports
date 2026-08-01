import type { PostInput } from "@/lib/posts";
import { DEFAULT_TEMPLATE, isTemplateId } from "@/lib/templates";

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

/** Relative paths point at /public assets and are safe; anything else must be http(s). */
function isUsableMediaUrl(value: string): boolean {
  return value.startsWith("/") || isSafeHttpUrl(value);
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

  const mediaUrl = asString(raw.media_url);
  if (!mediaUrl) {
    return { ok: false, error: "Media is required — upload an image or video, or paste a URL." };
  }
  if (!isUsableMediaUrl(mediaUrl)) {
    return { ok: false, error: "Media URL must start with http://, https:// or /." };
  }

  const mediaType = asString(raw.media_type) || "image";
  if (mediaType !== "image" && mediaType !== "video") {
    return { ok: false, error: "Media type must be either image or video." };
  }

  const posterUrl = asString(raw.poster_url);
  if (posterUrl && !isUsableMediaUrl(posterUrl)) {
    return { ok: false, error: "Poster URL must start with http://, https:// or /." };
  }

  const template = raw.template;
  if (template !== undefined && template !== null && template !== "" && !isTemplateId(template)) {
    return { ok: false, error: "Unknown template." };
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
      media_url: mediaUrl,
      media_key: asString(raw.media_key) || null,
      media_type: mediaType,
      poster_url: posterUrl || null,
      poster_key: asString(raw.poster_key) || null,
      template: isTemplateId(template) ? template : DEFAULT_TEMPLATE,
      instagram_url: instagramRaw || null,
      published_at: publishedAt.toISOString(),
      is_published: raw.is_published === undefined ? true : Boolean(raw.is_published),
    },
  };
}
