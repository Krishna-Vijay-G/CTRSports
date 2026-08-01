import { getSql } from "@/lib/db";

export type MediaPost = {
  id: string;
  title: string;
  subtext: string;
  image_url: string;
  image_key: string | null;
  instagram_url: string | null;
  /** ISO 8601 string — serialisable across the server/client boundary. */
  published_at: string;
  is_published: boolean;
};

type PostRow = Omit<MediaPost, "published_at"> & { published_at: string | Date };

function toPost(row: PostRow): MediaPost {
  return {
    ...row,
    published_at: new Date(row.published_at).toISOString(),
  };
}

/** Published posts only, newest first — what the public landing page renders. */
export async function listPublishedPosts(limit = 60): Promise<MediaPost[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, subtext, image_url, image_key, instagram_url, published_at, is_published
      FROM media_posts
     WHERE is_published = true
       AND published_at <= now()
     ORDER BY published_at DESC
     LIMIT ${limit}
  `) as PostRow[];

  return rows.map(toPost);
}

/** Every post including drafts and future-dated ones — admin dashboard view. */
export async function listAllPosts(): Promise<MediaPost[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, subtext, image_url, image_key, instagram_url, published_at, is_published
      FROM media_posts
     ORDER BY published_at DESC
  `) as PostRow[];

  return rows.map(toPost);
}

export async function getPost(id: string): Promise<MediaPost | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, title, subtext, image_url, image_key, instagram_url, published_at, is_published
      FROM media_posts
     WHERE id = ${id}
  `) as PostRow[];

  return rows[0] ? toPost(rows[0]) : null;
}

export type PostInput = {
  title: string;
  subtext: string;
  image_url: string;
  image_key: string | null;
  instagram_url: string | null;
  published_at: string;
  is_published: boolean;
};

export async function createPost(input: PostInput): Promise<MediaPost> {
  const sql = getSql();
  const rows = (await sql`
    INSERT INTO media_posts (title, subtext, image_url, image_key, instagram_url, published_at, is_published)
    VALUES (
      ${input.title},
      ${input.subtext},
      ${input.image_url},
      ${input.image_key},
      ${input.instagram_url},
      ${input.published_at},
      ${input.is_published}
    )
    RETURNING id, title, subtext, image_url, image_key, instagram_url, published_at, is_published
  `) as PostRow[];

  return toPost(rows[0]);
}

export async function updatePost(id: string, input: PostInput): Promise<MediaPost | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE media_posts
       SET title         = ${input.title},
           subtext       = ${input.subtext},
           image_url     = ${input.image_url},
           image_key     = ${input.image_key},
           instagram_url = ${input.instagram_url},
           published_at  = ${input.published_at},
           is_published  = ${input.is_published},
           updated_at    = now()
     WHERE id = ${id}
    RETURNING id, title, subtext, image_url, image_key, instagram_url, published_at, is_published
  `) as PostRow[];

  return rows[0] ? toPost(rows[0]) : null;
}

export async function deletePost(id: string): Promise<MediaPost | null> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM media_posts
     WHERE id = ${id}
    RETURNING id, title, subtext, image_url, image_key, instagram_url, published_at, is_published
  `) as PostRow[];

  return rows[0] ? toPost(rows[0]) : null;
}
