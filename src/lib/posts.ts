import type { TemplateId } from "@/lib/templates";
import type { LinkTypeId } from "@/lib/links";
import type { SportId } from "@/lib/sports";

/**
 * The post domain — shape only, safe to import anywhere. The queries that read
 * and write these rows live in `@/lib/server/postsRepo`, which pulls in the
 * database client and must never reach a client component.
 */

export type MediaType = "image" | "video";

export type MediaPost = {
  id: string;
  /** Which vertical the post belongs to — `main` is the landing page. */
  sport: SportId;
  /** Optional: a post can be media-only. */
  title: string | null;
  subtext: string;
  /** Optional: a post can be copy-only. Image or video, per `media_type`. */
  media_url: string | null;
  media_key: string | null;
  media_type: MediaType;
  /** Still frame for videos — captured from the first frame at upload time. */
  poster_url: string | null;
  poster_key: string | null;
  template: TemplateId;
  /** Where the call-to-action points, and what it is called. */
  link_type: LinkTypeId;
  link_url: string | null;
  /** Overrides the label derived from `link_type`; how `custom` gets its name. */
  link_label: string | null;
  /** ISO 8601 string — serialisable across the server/client boundary. */
  published_at: string;
  is_published: boolean;
};

/** Everything a write needs. Same fields as a post, minus the generated id. */
export type PostInput = Omit<MediaPost, "id">;
