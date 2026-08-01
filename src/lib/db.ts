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
      image_url     text NOT NULL,
      image_key     text,
      instagram_url text,
      published_at  timestamptz NOT NULL DEFAULT now(),
      is_published  boolean NOT NULL DEFAULT true,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now()
    )
  `;

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
