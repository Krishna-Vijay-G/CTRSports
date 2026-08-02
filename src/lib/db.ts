import { neon } from "@neondatabase/serverless";

/**
 * Neon HTTP client. One round-trip per query, no pooling to manage — the right
 * shape for Vercel's serverless functions where a long-lived pool would leak.
 */
let cached: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to .env (local) and to the Vercel project settings.");
  }

  cached = neon(url);
  return cached;
}

/**
 * Creates the media/admin tables when they are missing. Safe to call repeatedly;
 * the seed script and the login route both run it so a fresh database works
 * without a manual migration step.
 */
export async function ensureSchema() {
  const sql = getSql();

  await sql`
    CREATE TABLE IF NOT EXISTS media_posts (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title         text NOT NULL,
      subtext       text NOT NULL DEFAULT '',
      media_url     text NOT NULL,
      media_key     text,
      instagram_url text,
      published_at  timestamptz NOT NULL DEFAULT now(),
      is_published  boolean NOT NULL DEFAULT true,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now()
    )
  `;

  // v1 stored images only; the columns now carry either an image or a video.
  await sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'media_posts' AND column_name = 'image_url') THEN
        ALTER TABLE media_posts RENAME COLUMN image_url TO media_url;
      END IF;
      IF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'media_posts' AND column_name = 'image_key') THEN
        ALTER TABLE media_posts RENAME COLUMN image_key TO media_key;
      END IF;
    END $$
  `;

  await sql`ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image'`;
  await sql`ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS poster_url text`;
  await sql`ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS poster_key text`;
  await sql`ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS template text NOT NULL DEFAULT 'wedge'`;

  await sql`
    CREATE INDEX IF NOT EXISTS media_posts_published_at_idx
      ON media_posts (published_at DESC)
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username      text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      created_at    timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash text PRIMARY KEY,
      admin_id   uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}
