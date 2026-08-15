/**
 * The starting rows for a database that has none.
 *
 *   npm run db:seed
 *
 * Data, not schema — which is why it is here and not in a migration. A migration
 * describes the shape every copy of this database must have; these are the cards
 * and circuits and pages a NEW install starts with and that production has had
 * for months. Putting them in 0001 would mean re-inserting them into every
 * branch cut from production, and deleting one would mean it came back on the
 * next deploy.
 *
 * ── The rows are files; this is the loader ────────────────────────────────
 *
 * Everything seeded lives in scripts/seed-data/*.json, one file per kind:
 *
 *   sports.json     → ctr.sports
 *   circuits.json   → ctr.tracks, ctr.track_links
 *   decks.json      → ctr.decks, ctr.slugs, ctr.deck_pages   (empty by default)
 *   landing.json    ┐
 *   incrc.json      ┴→ ctr.page_sections and the four tables promoted out of it
 *
 * The sports and the circuits used to be array literals in this file, inherited
 * from scripts/schema.mjs when it was split up; the two page documents were
 * always files. That split was the residue of two changes made months apart
 * rather than a decision anyone made, and it meant a script whose job is to
 * insert rows was mostly the rows.
 *
 * Data in JSON also cannot be anything else. A literal in a script is code that
 * happens to look like data — it can hold an expression, a template string or a
 * trailing comma that changes what is stored, and none of that is visible in a
 * diff. The cost is that JSON takes no comments, so anything worth SAYING about
 * a row is said here, beside the insert that writes it.
 *
 * ── Running it twice ──────────────────────────────────────────────────────
 *
 * Each kind only fires on its own empty table, so this cannot resurrect a card
 * somebody deleted on purpose, and running it twice does nothing the second
 * time. The pages are per PAGE rather than per table — see seedPageContent.
 *
 * The four backfills that once sat beside `seedSports` and `seedTracks` are
 * gone: two are now statements in 0001, and the two that filled blanks from
 * these lists — `backfillSportPhotos` and `backfillTrackDetails` — existed only
 * for rows seeded before their columns did, and are verified applied against
 * production. The seeds below write every column, so a fresh install never
 * needs them.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

/**
 * Every row this script can write, as JSON beside it.
 *
 * The two page documents were always files; the sports and the circuits were
 * array literals a few hundred lines up from here, inherited from
 * scripts/schema.mjs and never reformatted when the files arrived. Two storage
 * formats in one script was the residue of two changes made months apart, not a
 * decision — so they are all files now, and this script is the loader and the
 * inserts and nothing else.
 *
 * Resolved from this file rather than from the working directory. `readFileSync`
 * on a relative path is resolved against `process.cwd()`, so the old form only
 * worked when the process happened to start at the repo root — true of
 * `npm run db:seed` and of nothing else.
 */
const DATA = join(dirname(fileURLToPath(import.meta.url)), "seed-data");

function load(name) {
  return JSON.parse(readFileSync(join(DATA, `${name}.json`), "utf8"));
}

/**
 * The landing and INCRC documents, in the row shape `writePage` writes — so the
 * console re-saving a page overwrites the seed with the same layout it read.
 * Generated once by scripts/export-seed-content.ts, since deleted. Edit the
 * JSON; there is nothing left to keep it in step with.
 */
const PAGE_CONTENT = ["landing", "incrc"].map(load);

const SEED_SPORTS = load("sports");
const SEED_TRACKS = load("circuits");

/**
 * The decks — a TEMPLATE in the repo, not real content.
 *
 * A deck is a scanned document (an entry pack, the regulations, a sponsorship
 * brief) and every page of it is a file in the media bucket. There is no
 * plausible starting set: a deck belongs to whoever made it, so what ships here
 * is one entry with the right shape and obviously wrong values, to be edited
 * rather than to be used.
 *
 * It is `"status": "draft"` on purpose, and that is the safety catch. A draft is
 * not on the internet: `/deck/<slug>` does not serve it and `listDeckSummaries`
 * filters it out, so a template accidentally seeded into a real database is
 * invisible until somebody deliberately publishes it. Change that word last.
 *
 *   name          What it is called. Printed above the pages when show_heading.
 *   slug          The address — /deck/<slug>. Lower case, hyphens, unique.
 *   status        "draft" or "published". Only published is public.
 *   blurb         One line, under the heading and on cards that link to it.
 *   show_heading  false when page one is already a cover carrying the title.
 *   sort_order    Ascending. Ties break on name.
 *   pages         In order. `url` is the image; `alt` blank falls back to
 *                 "<name>, page N".
 *
 * Adding a deck here is only half of putting it on /incrc — the page picks
 * which decks it shows, by slug, in the `decks` section of incrc.json. See the
 * note on seedPageContent.
 */
const SEED_DECKS = load("decks");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Make sure .env exists in the project root.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

/*
 * Schema-qualified, unlike the application. The app relies on the search_path
 * 0001 sets on the database, which is the right trade for a hundred queries; a
 * setup script that may be the first thing ever run against a database is better
 * off saying where it means.
 */
async function seedSports() {
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM ctr.sports`;
  if (count > 0) return 0;

  for (const sport of SEED_SPORTS) {
    await sql`
      INSERT INTO ctr.sports (title, text, details, logo_url, photo_url, href, sort_order)
      VALUES (${sport.title}, ${sport.text}, ${sport.details}, ${sport.logo_url},
              ${sport.photo_url}, ${sport.href}, ${sport.sort_order})
    `;
  }

  return SEED_SPORTS.length;
}

async function seedTracks() {
  const [{ count }] = await sql`SELECT count(*)::int AS count FROM ctr.tracks`;
  if (count > 0) return 0;

  for (const track of SEED_TRACKS) {
    const [{ id }] = await sql`
      INSERT INTO ctr.tracks (
        name, slug, location, photo_url, map_url, length, turns, direction, opened,
        broke_ground, former_names, owner, fia_grade, coordinates, capacity,
        major_events, lap_record_time, lap_record_year, note, sort_order
      )
      VALUES (
        ${track.name}, ${track.slug}, ${track.location}, ${track.photo_url ?? ""}, ${track.map_url ?? ""},
        ${track.length ?? ""}, ${track.turns ?? ""}, ${track.direction ?? ""},
        ${track.opened ?? ""}, ${track.broke_ground ?? ""}, ${track.former_names ?? ""},
        ${track.owner ?? ""}, ${track.fia_grade ?? ""}, ${track.coordinates ?? ""},
        ${track.capacity ?? ""}, ${track.major_events ?? ""},
        ${track.lap_record_time ?? ""}, ${track.lap_record_year ?? ""},
        ${track.note ?? ""}, ${track.sort_order}
      )
      RETURNING id
    `;

    // Rows since 0004, and the column they used to live in was dropped by 0008.
    // `position` is 1-based to match what the admin writer produces.
    const links = (track.links ?? []).filter((link) => link.href);

    for (const [index, link] of links.entries()) {
      await sql`
        INSERT INTO ctr.track_links (track_id, position, label, href)
        VALUES (${id}, ${index + 1}, ${link.label ?? ""}, ${link.href})
      `;
    }
  }

  return SEED_TRACKS.length;
}

/**
 * The decks, and the two tables that hang off each one.
 *
 * A deck is three writes, not one — `0008` dropped `decks.slug` and
 * `decks.pages`, so the address lives in the slug registry and the pages in
 * their own table. This does by hand what `insertDeck` in decksRepo does
 * through `writeSlugs` and `writePages`; the repo cannot be imported here
 * because it is TypeScript and reads its connection from the app's own config.
 *
 * `decks.json` is an empty array in the repo, so on a normal install this does
 * nothing at all — see the note on SEED_DECKS. It still guards on the table
 * being empty, because the day somebody fills the file in is the day this must
 * not run over decks that already exist.
 */
async function seedDecks() {
  if (SEED_DECKS.length === 0) return 0;

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM ctr.decks`;
  if (count > 0) return 0;

  for (const deck of SEED_DECKS) {
    const [{ id }] = await sql`
      INSERT INTO ctr.decks (name, status, blurb, show_heading, sort_order)
      VALUES (${deck.name}, ${deck.status ?? "draft"}, ${deck.blurb ?? ""},
              ${deck.show_heading ?? true}, ${deck.sort_order ?? 0})
      RETURNING id
    `;

    // The address. `is_current` true is what makes it the one /deck/<slug>
    // answers to; a seeded deck has no former addresses to redirect from.
    if (deck.slug) {
      await sql`
        INSERT INTO ctr.slugs (entity_type, slug, entity_id, is_current)
        VALUES ('deck', ${deck.slug}, ${id}, true)
      `;
    }

    // `position` is 1-based, matching what the admin writer produces — and the
    // table's own CHECK (position >= 1) refuses anything else.
    for (const [index, page] of (deck.pages ?? []).entries()) {
      await sql`
        INSERT INTO ctr.deck_pages (deck_id, position, url, alt)
        VALUES (${id}, ${index + 1}, ${page.url}, ${page.alt ?? ""})
      `;
    }
  }

  return SEED_DECKS.length;
}

/**
 * The landing and INCRC pages, as rows.
 *
 * These two documents were `DEFAULT_LANDING_CONTENT` and `DEFAULT_INCRC_CONTENT`
 * in src/lib — TypeScript constants that rendered whenever the page had no row,
 * which was always, because nothing ever wrote one. They are the page now, so
 * they are seeded like everything else and the constants are gone.
 *
 * scripts/seed-data/*.json is generated, not typed: the shape it lands in is
 * exactly what `writePage` produces, so the admin re-saving a page overwrites it
 * with the same layout it read. See the header of the (now deleted) exporter.
 *
 * Per PAGE rather than per table — a database that has the landing page but not
 * INCRC gets INCRC, and one that has both is left alone. Anything else would
 * either resurrect a section somebody deleted or refuse to seed a half-empty
 * install.
 *
 * ── Where a page's own lists live in the JSON ─────────────────────────────
 *
 * Four lists were promoted out of the document by `0006` and are tables of
 * their own, so in the JSON they sit at the TOP LEVEL rather than inside the
 * section they belong to:
 *
 *   banners  → ctr.banners          (both pages)
 *   rounds   → ctr.calendar_rounds  (the calendar section's rounds)
 *   posts    → ctr.posts            (the posts section's items)
 *   partners → ctr.partners         (the intro section's partner marks)
 *
 * So `sections[section_id="posts"].data` holds only that band's heading and
 * button; the articles themselves are `posts` at the root. Everything else —
 * `rows.items`, `stats.items`, `vision.items`, `family.links`,
 * `partnership.shots`, `decks.items` — stayed inside its section's `data`.
 *
 * ── Putting a deck on /incrc ──────────────────────────────────────────────
 *
 * Two halves, and both are needed. `decks.json` above makes the deck EXIST at
 * /deck/<slug>; the page then CHOOSES which decks to show, in the `decks`
 * section's `data.items`, each entry naming one by slug:
 *
 *   { "slug": "entry-pack", "title": "", "blurb": "" }
 *
 * The slug is the only part that is a reference. Blank `title` and `blurb` mean
 * "use the deck's own", which is what you want almost always — they are
 * overrides for the page that needs to call one something else in context.
 *
 * A card naming a deck that is missing, deleted or still a draft is DROPPED
 * rather than drawn as a dead link, so publishing the deck is what makes the
 * card appear. That is also why the entry forms below are NOT chosen this way:
 * every published form assigned to a page belongs on it, while a deck belongs
 * to nobody and somebody has to pick.
 */
async function seedPageContent() {
  const seeded = [];

  for (const page of PAGE_CONTENT) {
    const key = page.page_key;

    const [{ count }] = await sql`
      SELECT count(*)::int AS count FROM ctr.page_sections WHERE page_key = ${key}
    `;
    if (count > 0) continue;

    for (const section of page.sections) {
      await sql`
        INSERT INTO ctr.page_sections (page_key, section_id, position, visible, data)
        VALUES (${key}, ${section.section_id}, ${section.position}, ${section.visible},
                ${JSON.stringify(section.data)}::jsonb)
      `;
    }

    for (const banner of page.banners) {
      await sql`
        INSERT INTO ctr.banners (page_key, banner_id, position, template, image, fit,
                                 focus, overlay, title, subtitle, cta_label, cta_href)
        VALUES (${key}, ${banner.banner_id}, ${banner.position}, ${banner.template},
                ${banner.image}, ${banner.fit}, ${banner.focus}, ${banner.overlay},
                ${banner.title}, ${banner.subtitle}, ${banner.cta_label}, ${banner.cta_href})
      `;
    }

    for (const round of page.rounds) {
      await sql`
        INSERT INTO ctr.calendar_rounds (page_key, position, round, venue, city,
                                         date_from, date_to, dates, status, track_id)
        VALUES (${key}, ${round.position}, ${round.round}, ${round.venue}, ${round.city},
                ${round.date_from}, ${round.date_to}, ${round.dates}, ${round.status},
                -- Resolved the way writePage resolves it: a circuit that is not
                -- there lands as NULL, and the card falls back to the venue and
                -- city beside it.
                (SELECT id FROM ctr.tracks WHERE id::text = ${round.track_id}))
      `;
    }

    for (const post of page.posts) {
      await sql`
        INSERT INTO ctr.posts (page_key, post_id, position, image, category, date,
                               title, excerpt, href)
        VALUES (${key}, ${post.post_id}, ${post.position}, ${post.image}, ${post.category},
                ${post.date}, ${post.title}, ${post.excerpt}, ${post.href})
      `;
    }

    for (const partner of page.partners) {
      await sql`
        INSERT INTO ctr.partners (page_key, position, name, logo, href)
        VALUES (${key}, ${partner.position}, ${partner.name}, ${partner.logo}, ${partner.href})
      `;
    }

    seeded.push(
      `${key} (${page.sections.length} section(s), ${page.banners.length} banner(s)` +
        (page.rounds.length ? `, ${page.rounds.length} round(s)` : "") +
        (page.posts.length ? `, ${page.posts.length} post(s)` : "") +
        (page.partners.length ? `, ${page.partners.length} partner(s)` : "") +
        ")"
    );
  }

  return seeded;
}

try {
  const sports = await seedSports();
  console.log(sports ? `Seeded ${sports} sports.` : "ctr.sports already has rows — nothing seeded.");

  const tracks = await seedTracks();
  console.log(tracks ? `Seeded ${tracks} circuits.` : "ctr.tracks already has rows — nothing seeded.");

  const decks = await seedDecks();
  console.log(
    decks
      ? `Seeded ${decks} deck(s). Edit scripts/seed-data/decks.json — the shipped entry is a template.`
      : SEED_DECKS.length === 0
        ? "scripts/seed-data/decks.json is empty — no decks to seed."
        : "ctr.decks already has rows — nothing seeded."
  );

  // After the circuits, so a calendar round can resolve the track it names.
  const pages = await seedPageContent();
  if (pages.length === 0) {
    console.log("ctr.page_sections already has both pages — nothing seeded.");
  } else {
    for (const line of pages) console.log(`Seeded ${line}.`);
  }
} catch (error) {
  /*
   * 42P01 is undefined_table and nothing else. This used to match "does not
   * exist" anywhere in the message, which also catches undefined_column (42703)
   * — so a seed that had fallen behind a migration reported a missing schema and
   * sent you to re-run a migrate that had already worked.
   */
  if (error.code === "42P01") {
    console.error("The schema is not there yet. Run npm run db:migrate first.");
    process.exit(1);
  }

  console.error("Failed:", error.message);
  process.exit(1);
}
