import "server-only";

import { getSql } from "@/lib/server/db";
import type { MediaPost, PostInput } from "@/lib/posts";
import type { SportId } from "@/lib/sports";

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

/** Published posts for one vertical, newest first — what a public page renders. */
export async function listPublishedPosts(sport: SportId, limit = 60): Promise<MediaPost[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT ${sql.unsafe(COLUMNS)}
      FROM media_posts
     WHERE is_published = true
       AND published_at <= now()
       AND sport = ${sport}
     ORDER BY published_at DESC
     LIMIT ${limit}
  `) as PostRow[];

  return rows.map(toPost);
}

/** Every post including drafts and future-dated ones — admin dashboard view. */
export async function listAllPosts(): Promise<MediaPost[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT ${sql.unsafe(COLUMNS)}
      FROM media_posts
     ORDER BY published_at DESC
  `) as PostRow[];

  return rows.map(toPost);
}

export async function getPost(id: string): Promise<MediaPost | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT ${sql.unsafe(COLUMNS)}
      FROM media_posts
     WHERE id = ${id}
  `) as PostRow[];

  return rows[0] ? toPost(rows[0]) : null;
}

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
