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
    href: "",
    sort_order: 10,
  },
  {
    title: "Volleyball",
    text: "Kasi Warriors",
    details:
      "Vertical athleticism and controlled transition play power our volleyball program across elite competitions.",
    logo_url: "/images/sports/volleyball.webp",
    photo_url: "https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=800&q=72",
    href: "",
    sort_order: 20,
  },
  {
    title: "Cricket",
    text: "Accord Warriors",
    details:
      "Structured batting depth, precision bowling plans, and relentless fielding standards anchor this unit.",
    logo_url: "/images/sports/cricket.webp",
    photo_url: "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=800&q=72",
    href: "",
    sort_order: 30,
  },
  {
    title: "Field Hockey",
    text: "Accord Tamil Nadu Dragons",
    details:
      "Pace-driven pressing and disciplined circle execution make our hockey program sharp and competitive.",
    logo_url: "/images/sports/hockey.webp",
    photo_url: "https://images.unsplash.com/photo-1580748141549-71748dbe0bdc?auto=format&fit=crop&w=800&q=72",
    href: "",
    sort_order: 40,
  },
  {
    title: "Formula 4 Racing",
    text: "CTR Racing Development",
    details:
      "From telemetry to racecraft, the F4 pathway develops next-generation circuit talent with measurable rigor.",
    logo_url: "/images/sports/formula-4.webp",
    photo_url: "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=72",
    href: "",
    sort_order: 50,
  },
  {
    title: "Indian National Car Racing Championship",
    text: "National Circuit Program",
    details:
      "A professional national ladder connecting karting graduates to full circuit competition under one unified banner.",
    logo_url: "/images/sports/national-racing.webp",
    photo_url: "https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=72",
    href: "/incrc",
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

  // Where the card links to. Empty means the card is not a link at all, which is
  // the right default for a sport with no page of its own yet.
  await sql`ALTER TABLE ctr_sports ADD COLUMN IF NOT EXISTS href text NOT NULL DEFAULT ''`;

  await sql`
    CREATE INDEX IF NOT EXISTS ctr_sports_order_idx ON ctr_sports (sort_order, title)
  `;

  // The circuits. A table rather than a field on each round, because a track
  // outlives the season that visits it — the same one is raced on twice a year
  // and again next year, and its map and its length do not change when the
  // calendar does. Calendar rounds point at a row here by id.
  await sql`
    CREATE TABLE IF NOT EXISTS ctr_tracks (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name       text NOT NULL,
      location   text NOT NULL DEFAULT '',
      map_url    text NOT NULL DEFAULT '',
      length     text NOT NULL DEFAULT '',
      turns      text NOT NULL DEFAULT '',
      note       text NOT NULL DEFAULT '',
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS ctr_tracks_order_idx ON ctr_tracks (sort_order, name)
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
      INSERT INTO ctr_sports (title, text, details, logo_url, photo_url, href, sort_order)
      VALUES (${sport.title}, ${sport.text}, ${sport.details}, ${sport.logo_url},
              ${sport.photo_url}, ${sport.href}, ${sport.sort_order})
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

/** Kept in step with SEED_TRACKS in src/lib/tracks.ts. */
const SEED_TRACKS = [
  {
    name: "Kari Motor Speedway",
    location: "Coimbatore, Tamil Nadu",
    map_url: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Kari_Motor_Speedway_Layout.jpg",
    length: "2.10 km",
    turns: "10",
    note: "The home of Indian motorsport — tight, technical and unforgiving.",
    sort_order: 10,
  },
  {
    name: "Bren Raceway",
    location: "Doddaballapura, Bengaluru",
    map_url: "",
    length: "4.10 km",
    turns: "14",
    note: "India's newest permanent circuit, fast and flowing throughout.",
    sort_order: 20,
  },
  {
    name: "Madras International Circuit",
    location: "Irungattukottai, Chennai",
    map_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Irungattukottai_Race_Track_map_--_Full_track.svg/960px-Irungattukottai_Race_Track_map_--_Full_track.svg.png",
    length: "3.71 km",
    turns: "12",
    note: "A long back straight into a hairpin — the season's decider.",
    sort_order: 30,
  },
];

/**
 * Fills an empty ctr_tracks table with the three circuits the season runs on.
 * Only ever runs when the table has no rows, so it cannot resurrect a circuit
 * someone deleted on purpose.
 */
export async function seedTracks(sql) {
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM ctr_tracks`;
  if (count > 0) return 0;

  for (const track of SEED_TRACKS) {
    await sql`
      INSERT INTO ctr_tracks (name, location, map_url, length, turns, note, sort_order)
      VALUES (${track.name}, ${track.location}, ${track.map_url}, ${track.length},
              ${track.turns}, ${track.note}, ${track.sort_order})
    `;
  }

  return SEED_TRACKS.length;
}

const MONTH_NAMES = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/** "11–13 September 2026" → { start, end }. Null for anything else. */
function parseDateLine(line) {
  const text = String(line || "").trim().replace(/\u2013|\u2014/g, "-");

  const range = text.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  const single = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);

  const iso = (year, month, day) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  if (range) {
    const month = MONTH_NAMES.indexOf(range[3].toLowerCase());
    if (month < 0) return null;
    const year = Number(range[4]);
    return { start: iso(year, month, Number(range[1])), end: iso(year, month, Number(range[2])) };
  }

  if (single) {
    const month = MONTH_NAMES.indexOf(single[2].toLowerCase());
    if (month < 0) return null;
    const year = Number(single[3]);
    const day = Number(single[1]);
    return { start: iso(year, month, day), end: iso(year, month, day) };
  }

  return null;
}

/**
 * Gives the stored calendar rounds the two things they gained when the countdown
 * was added: real dates and a circuit to point at.
 *
 * Only ever fills a blank. A round whose dates someone has already set, or whose
 * circuit they have already picked, is left exactly as it is — so this is safe to
 * re-run and cannot undo an edit.
 *
 * Dates are read from the sentence the round was already printing, and only when
 * it is written the way the defaults write it. Anything it cannot parse with
 * certainty is left alone rather than guessed at; that round simply keeps its
 * sentence and has no countdown until someone sets the dates by hand.
 *
 * Circuits are matched on the venue name the round already carried, which is the
 * same name the tracks were seeded with.
 */
export async function backfillRoundDates(sql) {
  const rows = await sql`SELECT content FROM ctr_content WHERE key = 'incrc'`;
  if (rows.length === 0) return 0;

  const content = rows[0].content;
  const rounds = content?.calendar?.rounds;
  if (!Array.isArray(rounds) || rounds.length === 0) return 0;

  const tracks = await sql`SELECT id, name FROM ctr_tracks`;
  const byName = new Map(tracks.map((track) => [track.name.trim().toLowerCase(), track.id]));

  let changed = 0;

  for (const round of rounds) {
    let touched = false;

    if (!round.start && round.dates) {
      const parsed = parseDateLine(round.dates);
      if (parsed) {
        round.start = parsed.start;
        round.end = parsed.end;
        // The sentence and the dates now say the same thing; let the page write
        // it, so editing the dates changes what is printed.
        round.dates = "";
        touched = true;
      }
    }

    if (!round.trackId && round.venue) {
      const id = byName.get(String(round.venue).trim().toLowerCase());
      if (id) {
        round.trackId = id;
        touched = true;
      }
    }

    if (touched) changed += 1;
  }

  if (changed === 0) return 0;

  await sql`
    UPDATE ctr_content
       SET content = ${JSON.stringify(content)}::jsonb, updated_at = now()
     WHERE key = 'incrc'
  `;

  return changed;
}
