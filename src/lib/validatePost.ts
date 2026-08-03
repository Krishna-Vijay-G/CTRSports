import type { PostInput } from "@/lib/posts";
import { DEFAULT_TEMPLATE, isTemplateId } from "@/lib/templates";
import { DEFAULT_LINK_TYPE, LINK_LABEL_MAX, isLinkTypeId } from "@/lib/links";
import { DEFAULT_SPORT, isSportId } from "@/lib/sports";

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

  // Title, subtext, media and the link are each optional — but a post with none
  // of them would render as an empty card, so at least one has to be there.
  const title = asString(raw.title);
  if (title.length > 200) return { ok: false, error: "Title must be 200 characters or fewer." };

  const subtext = asString(raw.subtext);
  if (subtext.length > 2000) {
    return { ok: false, error: "Subtext must be 2000 characters or fewer." };
  }

  const mediaUrl = asString(raw.media_url);
  if (mediaUrl && !isUsableMediaUrl(mediaUrl)) {
    return { ok: false, error: "Media URL must start with http://, https:// or /." };
  }

  if (!title && !subtext && !mediaUrl) {
    return { ok: false, error: "Add at least a title, some subtext, or media." };
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

  const sport = raw.sport;
  if (sport !== undefined && sport !== null && sport !== "" && !isSportId(sport)) {
    return { ok: false, error: "Unknown sport." };
  }

  const linkType = raw.link_type;
  if (linkType !== undefined && linkType !== null && linkType !== "" && !isLinkTypeId(linkType)) {
    return { ok: false, error: "Unknown link type." };
  }

  const linkUrl = asString(raw.link_url);
  if (linkUrl && !isSafeHttpUrl(linkUrl)) {
    return { ok: false, error: "The link must be a full http:// or https:// URL." };
  }

  const linkLabel = asString(raw.link_label);
  if (linkLabel.length > LINK_LABEL_MAX) {
    return { ok: false, error: `Link name must be ${LINK_LABEL_MAX} characters or fewer.` };
  }

  const publishedRaw = asString(raw.published_at);
  const publishedAt = publishedRaw ? new Date(publishedRaw) : new Date();
  if (Number.isNaN(publishedAt.getTime())) {
    return { ok: false, error: "Date and time is not a valid date." };
  }

  return {
    ok: true,
    value: {
      sport: isSportId(sport) ? sport : DEFAULT_SPORT,
      title: title || null,
      subtext,
      media_url: mediaUrl || null,
      // A key without media of its own would strand an S3 object on the next edit.
      media_key: mediaUrl ? asString(raw.media_key) || null : null,
      media_type: mediaType,
      poster_url: posterUrl || null,
      poster_key: posterUrl ? asString(raw.poster_key) || null : null,
      template: isTemplateId(template) ? template : DEFAULT_TEMPLATE,
      link_type: isLinkTypeId(linkType) ? linkType : DEFAULT_LINK_TYPE,
      link_url: linkUrl || null,
      // A label with no link to put it on is dead data.
      link_label: linkUrl ? linkLabel || null : null,
      published_at: publishedAt.toISOString(),
      is_published: raw.is_published === undefined ? true : Boolean(raw.is_published),
    },
  };
}
