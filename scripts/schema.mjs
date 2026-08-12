/**
 * The whole schema, in one place, as plain SQL.
 *
 * Called by scripts/migrate.mjs and scripts/create-admin.mjs. Every statement is
 * IF NOT EXISTS, so running it twice is a no-op and running it against a live
 * database is safe.
 *
 * All three tables are prefixed `ctr_`. This database is its own today, but the
 * prefix keeps the option of sharing one with another CTR site open. Keep it.
 */

/** Kept in step with SEED_SPORTS in src/lib/sports.ts. */
const SEED_SPORTS = [
  {
    title: "Pickleball",
    text: "Chennai Super Warriors",
    details:
      "Explosive hand-speed, compact court strategy, and doubles chemistry define CTR's pickleball identity.",
    logo_url: "/images/sports/pickleball.webp",
    photo_url: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=800&q=72",
    sort_order: 10,
  },
  {
    title: "Volleyball",
    text: "Kasi Warriors",
    details:
      "Vertical athleticism and controlled transition play power our volleyball program across elite competitions.",
    logo_url: "/images/sports/volleyball.webp",
    photo_url: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=72",
    sort_order: 20,
  },
  {
    title: "Cricket",
    text: "Accord Warriors",
    details:
      "Structured batting depth, precision bowling plans, and relentless fielding standards anchor this unit.",
    logo_url: "/images/sports/cricket.webp",
    photo_url: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=72",
    sort_order: 30,
  },
  {
    title: "Field Hockey",
    text: "Accord Tamil Nadu Dragons",
    details:
      "Pace-driven pressing and disciplined circle execution make our hockey program sharp and competitive.",
    logo_url: "/images/sports/hockey.webp",
    photo_url: "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?auto=format&fit=crop&w=800&q=72",
    sort_order: 40,
  },
  {
    title: "Formula 4 Racing",
    text: "CTR Racing Development",
    details:
      "From telemetry to racecraft, the F4 pathway develops next-generation circuit talent with measurable rigor.",
    logo_url: "/images/sports/formula-4.webp",
    photo_url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=72",
    sort_order: 50,
  },
  {
    title: "Indian National Car Racing Championship",
    text: "National Circuit Program",
    details:
      "A professional national ladder connecting karting graduates to full circuit competition under one unified banner.",
    logo_url: "/images/sports/national-racing.webp",
    photo_url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=72",
    sort_order: 60,
  },
];

export async function migrate(sql) {
  await sql`
    CREATE TABLE IF NOT EXISTS ctr_admins (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      username      text NOT NULL UNIQUE,
      password_hash text NOT NULL,
      created_at    timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ctr_sessions (
      token_hash text PRIMARY KEY,
      admin_id   uuid NOT NULL REFERENCES ctr_admins(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  // A column per field rather than a JSON document: the shape is flat, it is
  // small, and ordering the cards is a plain ORDER BY.
  await sql`
    CREATE TABLE IF NOT EXISTS ctr_sports (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title      text NOT NULL,
      text       text NOT NULL DEFAULT '',
      details    text NOT NULL DEFAULT '',
      logo_url   text NOT NULL DEFAULT '',
      sort_order integer NOT NULL DEFAULT 0,
      is_visible boolean NOT NULL DEFAULT true,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`ALTER TABLE ctr_sports ADD COLUMN IF NOT EXISTS photo_url text NOT NULL DEFAULT ''`;

  await sql`
    CREATE INDEX IF NOT EXISTS ctr_sports_order_idx ON ctr_sports (sort_order, title)
  `;

  // Every word and picture on the landing page except the sports cards, as one
  // JSONB document per page ('landing' is the only key so far). A document
  // rather than a column per field: the shape is nested, it changes with the
  // design, and nothing ever queries inside it.
  await sql`
    CREATE TABLE IF NOT EXISTS ctr_content (
      key        text PRIMARY KEY,
      content    jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
}

/**
 * Fills an empty ctr_sports table with the starting six. Only ever runs when
 * the table has no rows, so it cannot resurrect a card someone deleted on
 * purpose.
 */
export async function seedSports(sql) {
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM ctr_sports`;
  if (count > 0) return 0;

  for (const sport of SEED_SPORTS) {
    await sql`
      INSERT INTO ctr_sports (title, text, details, logo_url, photo_url, sort_order)
      VALUES (${sport.title}, ${sport.text}, ${sport.details}, ${sport.logo_url},
              ${sport.photo_url}, ${sport.sort_order})
    `;
  }

  return SEED_SPORTS.length;
}

/**
 * Gives a photo to any sport that has none, matched by title against the seed
 * list. Only ever fills a blank, so a photo someone chose is never overwritten
 * and a card they deliberately left photoless stays that way once they set
 * anything else.
 *
 * Needed because photo_url was added after the table already had rows.
 */
export async function backfillSportPhotos(sql) {
  let filled = 0;

  for (const sport of SEED_SPORTS) {
    const rows = await sql`
      UPDATE ctr_sports
         SET photo_url = ${sport.photo_url}, updated_at = now()
       WHERE title = ${sport.title} AND photo_url = ''
      RETURNING id
    `;
    filled += rows.length;
  }

  return filled;
}
