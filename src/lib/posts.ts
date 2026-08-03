import { getSql } from "@/lib/db";
import type { TemplateId } from "@/lib/templates";
import type { LinkTypeId } from "@/lib/links";
import type { SportId } from "@/lib/sports";

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

const COLUMNS =
  "id, sport, title, subtext, media_url, media_key, media_type, poster_url, poster_key, " +
  "template, link_type, link_url, link_label, published_at, is_published";

type PostRow = Omit<MediaPost, "published_at"> & { published_at: string | Date };

function toPost(row: PostRow): MediaPost {
  return {
    ...row,
    published_at: new Date(row.published_at).toISOString(),
  };
}

/**
 * Published posts for one vertical, newest first — what a public page renders.
 * Pass `sport` to scope it; omit for every vertical at once.
 */
export async function listPublishedPosts(sport?: SportId, limit = 60): Promise<MediaPost[]> {
  const sql = getSql();

  // Two statements rather than one with an `OR sport IS NULL` guard, so the
  // scoped query can use the (sport, published_at) index.
  const rows = (await (sport
    ? sql`
        SELECT id, sport, title, subtext, media_url, media_key, media_type, poster_url, poster_key,
               template, link_type, link_url, link_label, published_at, is_published
          FROM media_posts
         WHERE is_published = true
           AND published_at <= now()
           AND sport = ${sport}
         ORDER BY published_at DESC
         LIMIT ${limit}
      `
    : sql`
        SELECT id, sport, title, subtext, media_url, media_key, media_type, poster_url, poster_key,
               template, link_type, link_url, link_label, published_at, is_published
          FROM media_posts
         WHERE is_published = true
           AND published_at <= now()
         ORDER BY published_at DESC
         LIMIT ${limit}
      `)) as PostRow[];

  return rows.map(toPost);
}

/** Every post including drafts and future-dated ones — admin dashboard view. */
export async function listAllPosts(): Promise<MediaPost[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, sport, title, subtext, media_url, media_key, media_type, poster_url, poster_key,
           template, link_type, link_url, link_label, published_at, is_published
      FROM media_posts
     ORDER BY published_at DESC
  `) as PostRow[];

  return rows.map(toPost);
}

export async function getPost(id: string): Promise<MediaPost | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, sport, title, subtext, media_url, media_key, media_type, poster_url, poster_key,
           template, link_type, link_url, link_label, published_at, is_published
      FROM media_posts
     WHERE id = ${id}
  `) as PostRow[];

  return rows[0] ? toPost(rows[0]) : null;
}

export type PostInput = {
  sport: SportId;
  title: string | null;
  subtext: string;
  media_url: string | null;
  media_key: string | null;
  media_type: MediaType;
  poster_url: string | null;
  poster_key: string | null;
  template: TemplateId;
  link_type: LinkTypeId;
  link_url: string | null;
  link_label: string | null;
  published_at: string;
  is_published: boolean;
};

export async function createPost(input: PostInput): Promise<MediaPost> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO media_posts
      (sport, title, subtext, media_url, media_key, media_type, poster_url, poster_key,
       template, link_type, link_url, link_label, published_at, is_published)
    VALUES (
      ${input.sport},
      ${input.title},
      ${input.subtext},
      ${input.media_url},
      ${input.media_key},
      ${input.media_type},
      ${input.poster_url},
      ${input.poster_key},
      ${input.template},
      ${input.link_type},
      ${input.link_url},
      ${input.link_label},
      ${input.published_at},
      ${input.is_published}
    )
    RETURNING ${sql.unsafe(COLUMNS)}
  `) as PostRow[];

  return toPost(rows[0]);
}

export async function updatePost(id: string, input: PostInput): Promise<MediaPost | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE media_posts
       SET sport         = ${input.sport},
           title         = ${input.title},
           subtext       = ${input.subtext},
           media_url     = ${input.media_url},
           media_key     = ${input.media_key},
           media_type    = ${input.media_type},
           poster_url    = ${input.poster_url},
           poster_key    = ${input.poster_key},
           template      = ${input.template},
           link_type     = ${input.link_type},
           link_url      = ${input.link_url},
           link_label    = ${input.link_label},
           published_at  = ${input.published_at},
           is_published  = ${input.is_published},
           updated_at    = now()
     WHERE id = ${id}
    RETURNING ${sql.unsafe(COLUMNS)}
  `) as PostRow[];

  return rows[0] ? toPost(rows[0]) : null;
}

export async function deletePost(id: string): Promise<MediaPost | null> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM media_posts
     WHERE id = ${id}
    RETURNING ${sql.unsafe(COLUMNS)}
  `) as PostRow[];

  return rows[0] ? toPost(rows[0]) : null;
}
