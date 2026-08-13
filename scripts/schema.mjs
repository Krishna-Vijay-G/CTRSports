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

  /*
   * What an account may touch. Three roles, and they divide the admin by the
   * thing being edited rather than by a list of permissions:
   *
   *   owner          everything, including the accounts themselves
   *   pages          only the page editors named in `pages`
   *   registrations  only the forms and the entries — no page copy at all
   *
   * Added with DEFAULT 'owner', which IS the backfill: every account that
   * existed before this ran keeps exactly the access it had, so a deploy cannot
   * lock anyone out of their own site. The default is then changed to 'pages'
   * below, so an account created afterwards without a role named is the least
   * privileged one rather than the most.
   *
   * No CHECK constraint on the value: Postgres has no ADD CONSTRAINT IF NOT
   * EXISTS, so one could not be added idempotently, and the value is put
   * through `oneOf` on the way out of the database anyway — which is what makes
   * retiring a role a code change and nothing else.
   */
  await sql`ALTER TABLE ctr_admins ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner'`;
  await sql`ALTER TABLE ctr_admins ALTER COLUMN role SET DEFAULT 'pages'`;

  // Which page editors a `pages` admin may open. Ignored for the other two: an
  // owner has all of them and a registrations admin has none. A list, so JSONB
  // — the same reasoning ctr_tracks.links gives for not being a column per key.
  await sql`ALTER TABLE ctr_admins ADD COLUMN IF NOT EXISTS pages jsonb NOT NULL DEFAULT '[]'::jsonb`;

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

  /*
   * The circuit's own record, in the shape a motorsport reference keeps it —
   * the fields a Wikipedia circuit infobox carries.
   *
   * Every one is text, including the years and the lap time. A circuit "opened"
   * in "1990" but also in "2010 (rebuilt)", and a lap record is "1:30.323". The
   * moment one of these needs arithmetic done to it, it can be narrowed; until
   * then a column that cannot hold the truth is worse than a loose one.
   *
   * `races_held` is the exception and is a real count, because that is a number
   * someone will want to sort or sum one day.
   *
   * Deliberately ABSENT: who holds the lap record, and in what car. Those are a
   * racer and a team, and they get tables of their own — a text column here
   * would have to be unpicked into a foreign key later.
   */
  for (const column of [
    "photo_url",
    "svg_path",
    "svg_view_box",
    "former_names",
    "owner",
    "fia_grade",
    "direction",
    "opened",
    "broke_ground",
    "coordinates",
    "capacity",
    // Nothing reads `website` any more — the links migration below moved it into
    // `links`. It stays in this list because that statement reads it, so on a
    // database that never had the column it still has to be created first.
    "website",
    "major_events",
    "lap_record_time",
    "lap_record_year",
  ]) {
    // sql.query, not sql(): the driver only takes a plain string through the
    // query method — the tag form is reserved for parameterised templates. The
    // column names come from the literal list above, never from input.
    await sql.query(
      `ALTER TABLE ctr_tracks ADD COLUMN IF NOT EXISTS ${column} text NOT NULL DEFAULT ''`
    );
  }

  await sql`ALTER TABLE ctr_tracks ADD COLUMN IF NOT EXISTS races_held integer NOT NULL DEFAULT 0`;

  /*
   * Related links: a list, so JSONB rather than a column.
   *
   * `website` was a single named link, which is the shape that has to be
   * migrated the moment somebody wants a second one — an entry list, a lap
   * record video, a map. This is that migration, and it is the last one of its
   * kind for links.
   */
  await sql`
    ALTER TABLE ctr_tracks
      ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]'::jsonb
  `;

  /*
   * Carries the old single website across as the first related link.
   *
   * Only fires on a circuit whose list is still empty, so it cannot duplicate a
   * link someone has already added, and re-running it does nothing.
   *
   * The `website` column itself is left in place rather than dropped: the app no
   * longer reads or writes it, and keeping it costs nothing while it is the only
   * copy of what was there before this ran.
   */
  await sql`
    UPDATE ctr_tracks
       SET links = jsonb_build_array(
             jsonb_build_object('label', 'Official site', 'href', website)
           ),
           updated_at = now()
     WHERE links = '[]'::jsonb AND website <> ''
  `;

  /*
   * map_url held photographs before there was a column for them — the calendar
   * was using it as the circuit's picture. Now that a layout map and a photo are
   * separate things, move what is there into photo_url and leave map_url for an
   * actual drawing of the track.
   *
   * Only ever fills a blank photo_url, so it is safe to re-run and cannot
   * overwrite a picture someone has since chosen.
   */
  await sql`
    UPDATE ctr_tracks
       SET photo_url = map_url, map_url = '', updated_at = now()
     WHERE photo_url = '' AND map_url <> ''
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

  /*
   * A registration form.
   *
   * The site used to send anyone wanting to enter to a form on the older CTR
   * site. This is that form, here — which is what makes an entry a row in this
   * database, and what lets the person who owns entries be somebody other than
   * the person who owns the page the form is linked from.
   *
   * The flat parts are columns and the questions are JSONB, which is the same
   * split ctr_tracks makes for its links: a shape that never changes is a
   * column, and a list whose entries are invented by whoever is editing is a
   * document.
   *
   * `slug` is a stored column rather than a slug derived from the name, unlike
   * a circuit's. A circuit's address is a convenience; a form's is printed on a
   * poster and put behind a QR code, so it has to survive a rename — hence
   * `former_slugs`, which the public page redirects from.
   *
   * `notify_to` is stored and not yet read. There is no mail transport in this
   * project and this does not add one; collecting the address now is what makes
   * adding one later a transport rather than a migration.
   */
  await sql`
    CREATE TABLE IF NOT EXISTS ctr_forms (
      id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name          text NOT NULL,
      slug          text NOT NULL UNIQUE,
      page_key      text NOT NULL DEFAULT '',
      status        text NOT NULL DEFAULT 'draft',
      blurb         text NOT NULL DEFAULT '',
      intro_title   text NOT NULL DEFAULT '',
      intro_body    text NOT NULL DEFAULT '',
      submit_label  text NOT NULL DEFAULT 'Send',
      success_title text NOT NULL DEFAULT '',
      success_body  text NOT NULL DEFAULT '',
      closed_note   text NOT NULL DEFAULT '',
      notify_to     text NOT NULL DEFAULT '',
      fields        jsonb NOT NULL DEFAULT '[]'::jsonb,
      former_slugs  jsonb NOT NULL DEFAULT '[]'::jsonb,
      sort_order    integer NOT NULL DEFAULT 0,
      created_at    timestamptz NOT NULL DEFAULT now(),
      updated_at    timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS ctr_forms_page_idx ON ctr_forms (page_key, sort_order, name)
  `;

  /*
   * When a form takes entries, and how many.
   *
   * `status` stays the switch a person throws; these are the conditions that
   * decide alongside it. A form is only open if it is set to open AND is inside
   * its window AND has places left — which means nobody has to remember to come
   * back at midnight on the closing date, and an event with sixty places stops
   * at sixty rather than at whenever somebody notices.
   *
   * Null means no bound: no opening date is "as soon as it is published", no
   * closing date is "until somebody closes it", and zero places is unlimited.
   */
  await sql`ALTER TABLE ctr_forms ADD COLUMN IF NOT EXISTS opens_at timestamptz`;
  await sql`ALTER TABLE ctr_forms ADD COLUMN IF NOT EXISTS closes_at timestamptz`;
  await sql`ALTER TABLE ctr_forms ADD COLUMN IF NOT EXISTS max_entries integer NOT NULL DEFAULT 0`;

  /*
   * The pages a long form is broken into.
   *
   * JSONB and not a table of its own, for the reason the questions are JSONB: a
   * section has no life outside the form it belongs to, nothing ever queries
   * one, and it is always read with the rest of the document. An empty list —
   * which is every form that existed before this — means one page and no
   * stepper, so nothing about those forms changes.
   */
  await sql`ALTER TABLE ctr_forms ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb`;

  /*
   * One submission.
   *
   * `answers` is keyed by FIELD ID, never by label: a label is edited freely
   * and an entry has to keep meaning what it meant when it was sent. It is also
   * why a field's id is never reused.
   *
   * The column is `answers` rather than the obvious `values` because that is a
   * reserved word, and every query would have to quote it.
   *
   * The ip and the user agent are kept for one purpose: telling a burst of spam
   * from a busy afternoon. They are never shown on the public site, never in
   * the default export, and go with the form when it is deleted.
   */
  await sql`
    CREATE TABLE IF NOT EXISTS ctr_form_entries (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      form_id    uuid NOT NULL REFERENCES ctr_forms(id) ON DELETE CASCADE,
      answers    jsonb NOT NULL DEFAULT '{}'::jsonb,
      ip         text NOT NULL DEFAULT '',
      user_agent text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS ctr_form_entries_form_idx
      ON ctr_form_entries (form_id, created_at DESC)
  `;

  /*
   * Nonces that have been spent.
   *
   * The token stamped into a form page is an HMAC over the slug and the time it
   * was rendered, which proves the page was served by this site and roughly
   * when — but on its own proves nothing about how many times it has been used.
   * It was replayable for its whole two-hour life, so one fetched page was two
   * hours of submissions.
   *
   * A row here is "this one has been spent". The primary key does the work: two
   * requests carrying the same nonce race to insert it and exactly one wins,
   * across however many instances are running, which an in-process set could
   * never manage.
   *
   * It doubles as the answer to the duplicate a flaky network produces — a
   * retry after a response that was lost in transit carries the same nonce as
   * the request that actually landed, and is refused rather than stored twice.
   *
   * Rows are swept when they expire; there is no scheduler here, so it happens
   * opportunistically on write. See registerToken.ts.
   */
  await sql`
    CREATE TABLE IF NOT EXISTS ctr_form_nonces (
      nonce      text PRIMARY KEY,
      expires_at timestamptz NOT NULL
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS ctr_form_nonces_expiry_idx ON ctr_form_nonces (expires_at)
  `;

  /*
   * A deck: a run of images published at an address of its own.
   *
   * A row rather than a section of a page, because a deck belongs to nobody. It
   * exists at /deck/<slug> whether or not anything links to it, which is what
   * makes it something you can put on a poster or hand to a partner — and what
   * lets three different pages point at one without copying it three times.
   *
   * `slug` is UNIQUE and `former_slugs` carries every address it has ever had,
   * for the same reason the forms table does: the address gets printed, so it
   * has to survive a rename. The public page redirects the old ones.
   *
   * `pages` is JSONB and not a table of its own — a page has no life outside
   * the deck it belongs to, nothing ever queries one, and it is always read
   * with the rest of the row. Its position in the array is its page number;
   * nothing stores one.
   */
  await sql`
    CREATE TABLE IF NOT EXISTS ctr_decks (
      id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name         text NOT NULL,
      slug         text NOT NULL UNIQUE,
      status       text NOT NULL DEFAULT 'draft',
      blurb        text NOT NULL DEFAULT '',
      show_heading boolean NOT NULL DEFAULT true,
      pages        jsonb NOT NULL DEFAULT '[]'::jsonb,
      former_slugs jsonb NOT NULL DEFAULT '[]'::jsonb,
      sort_order   integer NOT NULL DEFAULT 0,
      created_at   timestamptz NOT NULL DEFAULT now(),
      updated_at   timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS ctr_decks_order_idx ON ctr_decks (sort_order, name)
  `;

  /*
   * A message sent from the footer.
   *
   * Its own table rather than a registration form with three questions on it:
   * an entry belongs to a form and is read on that form's screen, while this
   * belongs to nobody and arrives from every page on the site. Giving it a
   * table is also what makes the send button honest — a form that validates
   * politely and then drops what it was given is worse than no form.
   *
   * `handled` is the one piece of state a message has: somebody has replied, or
   * has not. It is a flag rather than a status column because there is no third
   * answer, and no screen reads it yet.
   *
   * The ip and the user agent are kept for the reason the entries table keeps
   * them: telling a burst of spam from a busy afternoon. They are never shown
   * on the public site.
   */
  await sql`
    CREATE TABLE IF NOT EXISTS ctr_enquiries (
      id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name       text NOT NULL,
      email      text NOT NULL,
      message    text NOT NULL,
      handled    boolean NOT NULL DEFAULT false,
      ip         text NOT NULL DEFAULT '',
      user_agent text NOT NULL DEFAULT '',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS ctr_enquiries_recent_idx ON ctr_enquiries (created_at DESC)
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
    photo_url:
      "https://cdn-s3.autocarindia.com/legacy/cdni/ExtraImages/20200907014213_Kari-Motor-Speedway-upgrades-1.jpg",
    map_url: "https://upload.wikimedia.org/wikipedia/commons/f/fe/Kari_Motor_Speedway_Layout.jpg",
    length: "2.10 km",
    turns: "10",
    direction: "Clockwise",
    opened: "2003",
    owner: "Kari Motor Speedway Pvt Ltd",
    fia_grade: "3",
    major_events: ["Indian Racing League", "MRF Formula 2000", "F4 India"].join("\n"),
    note: "The home of Indian motorsport — tight, technical and unforgiving.",
    sort_order: 10,
  },
  {
    name: "Bren Raceway",
    location: "Doddaballapura, Bengaluru",
    photo_url:
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTJqHEDj58zIR2oJEUa-EON-z44C2RuwoFAFAj4l7_b8vKLRvhrz1zTHbkg&s=10",
    map_url: "",
    length: "4.10 km",
    turns: "14",
    direction: "Anti-clockwise",
    fia_grade: "2",
    note: "India's newest permanent circuit, fast and flowing throughout.",
    sort_order: 20,
  },
  {
    name: "Madras International Circuit",
    location: "Irungattukottai, Chennai",
    photo_url:
      "https://cdn-s3.autocarindia.com/legacy/cdni/ExtraImages/20240920010433_Madras_international_karting_arena.jpg",
    map_url:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/63/Irungattukottai_Race_Track_map_--_Full_track.svg/960px-Irungattukottai_Race_Track_map_--_Full_track.svg.png",
    length: "3.71 km",
    turns: "12",
    direction: "Clockwise",
    opened: "1990",
    broke_ground: "1988",
    former_names: "Madras Motor Race Track; Irungattukottai Race Track",
    owner: "Madras Motor Sports Club",
    fia_grade: "2",
    coordinates: "13°0′9″N 79°59′9″E",
    links: [{ label: "Official site", href: "https://en.madrasmotorsports.com" }],
    major_events: [
      "MRF Formula 2000",
      "Indian Racing League",
      "F4 India",
      "F4 SEA",
      "Asia Road Racing Championship",
      "Asian F3",
    ].join("\n"),
    lap_record_time: "1:30.323",
    lap_record_year: "2020",
    note: "A long back straight into a hairpin — the season's decider.",
    sort_order: 30,
  },
];

/**
 * The columns `backfillTrackDetails` is allowed to touch.
 *
 * Text only, and only the ones that describe the circuit rather than the ones
 * someone curates: `length`, `turns` and `note` are left out because the rows
 * already carry values for them that were edited after seeding, and a backfill
 * that "corrected" 3.71 km to 3.717 km would be overwriting a decision.
 *
 * A fixed literal list, which is what makes it safe to interpolate the names
 * into SQL below — nothing here comes from a row or a request.
 */
const FILLABLE_TRACK_COLUMNS = [
  "photo_url",
  "map_url",
  "direction",
  "opened",
  "broke_ground",
  "former_names",
  "owner",
  "fia_grade",
  "coordinates",
  "capacity",
  "major_events",
  "lap_record_time",
  "lap_record_year",
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
      INSERT INTO ctr_tracks (
        name, location, photo_url, map_url, length, turns, direction, opened,
        broke_ground, former_names, owner, fia_grade, coordinates, capacity,
        links, major_events, lap_record_time, lap_record_year, note, sort_order
      )
      VALUES (
        ${track.name}, ${track.location}, ${track.photo_url ?? ""}, ${track.map_url ?? ""},
        ${track.length ?? ""}, ${track.turns ?? ""}, ${track.direction ?? ""},
        ${track.opened ?? ""}, ${track.broke_ground ?? ""}, ${track.former_names ?? ""},
        ${track.owner ?? ""}, ${track.fia_grade ?? ""}, ${track.coordinates ?? ""},
        ${track.capacity ?? ""}, ${JSON.stringify(track.links ?? [])}::jsonb,
        ${track.major_events ?? ""},
        ${track.lap_record_time ?? ""}, ${track.lap_record_year ?? ""},
        ${track.note ?? ""}, ${track.sort_order}
      )
    `;
  }

  return SEED_TRACKS.length;
}

/**
 * Fills in the record of a circuit that was seeded before the record existed.
 *
 * The circuits table started life with a name, a location, a length and a corner
 * count. Everything a circuit page actually reads — when it opened, who owns it,
 * its FIA grade, the outright lap record, the championships it hosts — was added
 * to the table later, and `seedTracks` could not put it there because it only
 * ever fires on an empty table. So the three seeded circuits sat with fourteen
 * blank columns and the circuit pages had almost nothing to print.
 *
 * Only ever fills a blank, in both directions: a column with anything in it is
 * left exactly as it is, and a seed value that is itself empty is not written.
 * That makes it safe to re-run, and it cannot undo an edit made in the admin.
 *
 * Matched on the name, which is how the rows were seeded and the only stable
 * handle there is — ids are generated. A renamed circuit simply is not matched,
 * which is the right answer: someone has been in there and made it theirs.
 */
export async function backfillTrackDetails(sql) {
  let filled = 0;

  for (const track of SEED_TRACKS) {
    const assignments = [];
    const blankTests = [];
    const values = [];

    for (const column of FILLABLE_TRACK_COLUMNS) {
      const value = track[column];
      if (!value) continue;

      values.push(value);
      // Per column, not per row: a circuit with an owner but no grade gets the
      // grade and keeps the owner.
      assignments.push(`${column} = CASE WHEN ${column} = '' THEN $${values.length} ELSE ${column} END`);
      blankTests.push(`${column} = ''`);
    }

    if (assignments.length === 0) continue;

    // Without this guard every run would report every row as touched, and
    // updated_at would move on rows that did not change.
    values.push(track.name);
    const rows = await sql.query(
      `UPDATE ctr_tracks
          SET ${assignments.join(", ")}, updated_at = now()
        WHERE lower(name) = lower($${values.length})
          AND (${blankTests.join(" OR ")})
        RETURNING id`,
      values
    );

    filled += rows.length;
  }

  return filled;
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

/** Where entry forms used to live, before they were on this site. */
const OLD_REGISTRATION_HOST = "https://chennaiturboriders.in";

/**
 * Points the registration band back at this site.
 *
 * Entry forms are now pages here — /register/<slug> — so nothing about
 * registering should send a visitor to the older CTR site. Changing the DEFAULT
 * in src/lib/incrcContent.ts is not enough on its own: a default only applies
 * to a field that is MISSING, and any database that has ever saved the incrc
 * document is still carrying the old address in it.
 *
 * So this rewrites it, once, to `#registrations` — the section listing every
 * form for the page. Not to a form's address, because there may not be a form
 * yet and a button pointing at a 404 is worse than one pointing at a list.
 *
 * Only ever touches a link to that old host. An address somebody has since set
 * for themselves — including a /register/… one they have already chosen — is
 * left exactly as it is, so this is safe to re-run and cannot undo an edit.
 */
export async function backfillRegisterCta(sql) {
  const rows = await sql`SELECT content FROM ctr_content WHERE key = 'incrc'`;
  if (rows.length === 0) return 0;

  const content = rows[0].content;
  const href = content?.register?.ctaHref;

  if (typeof href !== "string" || !href.startsWith(OLD_REGISTRATION_HOST)) return 0;

  content.register.ctaHref = "#registrations";

  await sql`
    UPDATE ctr_content
       SET content = ${JSON.stringify(content)}::jsonb, updated_at = now()
     WHERE key = 'incrc'
  `;

  return 1;
}
