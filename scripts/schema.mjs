/**
 * The database shape, for the standalone scripts. Idempotent — safe to re-run.
 * Used by `npm run migrate` and `npm run create-admin`.
 *
 * The app carries its own copy in `ensureSchema()` (src/lib/server/db.ts) because
 * a bundled Next route cannot import a loose .mjs from outside src/. The two
 * bodies must stay identical — change one, change the other.
 */
export async function migrate(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS media_posts (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title         text,
      subtext       text NOT NULL DEFAULT '',
      media_url     text,
      media_key     text,
      link_url      text,
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

  // v2 pointed every post at Instagram. The CTA now carries its own type and
  // label, so the column is no longer named after one destination.
  await sql`
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_name = 'media_posts' AND column_name = 'instagram_url')
         AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name = 'media_posts' AND column_name = 'link_url') THEN
        ALTER TABLE media_posts RENAME COLUMN instagram_url TO link_url;
      END IF;
    END $$
  `;

  await sql`ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS link_url text`;
  // Defaulting to 'instagram' back-fills the pre-existing links correctly.
  await sql`ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS link_type text NOT NULL DEFAULT 'instagram'`;
  await sql`ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS link_label text`;

  // Which vertical the post belongs to. 'main' is the landing page.
  await sql`ALTER TABLE media_posts ADD COLUMN IF NOT EXISTS sport text NOT NULL DEFAULT 'main'`;

  // Title and media became optional alongside the link — a post now only has to
  // carry at least one of title / subtext / media.
  await sql`ALTER TABLE media_posts ALTER COLUMN title DROP NOT NULL`;
  await sql`ALTER TABLE media_posts ALTER COLUMN media_url DROP NOT NULL`;

  await sql`CREATE INDEX IF NOT EXISTS media_posts_published_at_idx ON media_posts (published_at DESC)`;
  await sql`
    CREATE INDEX IF NOT EXISTS media_posts_sport_published_at_idx
      ON media_posts (sport, published_at DESC)
  `;

  // Editable page copy, one JSONB document per page ('landing' is the only key
  // so far). A document rather than a column per field: the shape is nested and
  // changes with the design, and nothing ever queries inside it.
  await sql`
    CREATE TABLE IF NOT EXISTS site_content (
      key        text PRIMARY KEY,
      content    jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username      text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      created_at    timestamptz NOT NULL DEFAULT now()
    )
  `;

  // Which admin section this account can reach — an AdminRoleId from
  // src/lib/adminRoles.ts.
  await sql`ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'super_admin'`;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      token_hash text PRIMARY KEY,
      admin_id   uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  // Entries from the /academy/registration form. `category` is a RaceCategoryId
  // from src/lib/raceCategories.ts; `gender` is a Gender from src/lib/registrations.ts.
  await sql`
    CREATE TABLE IF NOT EXISTS race_registrations (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name       text NOT NULL,
      dob        date NOT NULL,
      gender     text,
      category   text NOT NULL,
      phone      text NOT NULL,
      email      text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  // Nullable on purpose: entries submitted before this column existed have no
  // gender, and picking a default for them would fabricate data.
  await sql`ALTER TABLE race_registrations ADD COLUMN IF NOT EXISTS gender text`;

  // Each page's scrolling announcement strip. 'main' is the landing page,
  // every other key is a SportId.
  await sql`
    CREATE TABLE IF NOT EXISTS page_marquees (
      sport      text PRIMARY KEY,
      items      jsonb NOT NULL DEFAULT '[]',
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}
