/**
 * Moves the media URLs already sitting in the database onto the new host.
 *
 *   npm run migrate:media -- --dry-run     count what would change
 *   npm run migrate:media                  change it
 *
 * ── Why this is needed at all ─────────────────────────────────────────────
 *
 * `publicUrl()` returns an ABSOLUTE URL and the admin stores exactly what the
 * upload route handed back (src/admin/components/ImageField.tsx,
 * src/admin/screens/decks/DeckForm.tsx), while `normalise.image()` passes any
 * http(s) string straight through. So every row written before the CDN existed
 * holds the raw S3 hostname, and setting NEXT_PUBLIC_MEDIA_BASE_URL only
 * changes what NEW uploads get. This is the one-shot that catches up the rest.
 *
 * Run it AFTER the distribution is live and the code is deployed, and BEFORE
 * the bucket's public-read policy comes off — an object whose URL is still the
 * S3 one keeps working right up until that last step, and then does not.
 *
 * ── What it touches ───────────────────────────────────────────────────────
 *
 * Every column that can hold an image URL, per migrations/0001_baseline.sql.
 * The JSONB ones are replaced through their text form, which is safe because a URL
 * contains no character JSON escapes — and jsonb is already normalised on
 * storage, so the round-trip changes nothing but the string.
 *
 * `forms.fields` / `sections` and `tracks.links` are in the list even
 * though nothing writes an upload into them, because their text is
 * author-written and an editor can paste one. A pasted URL that is missed here
 * is a picture that vanishes the day the bucket goes private.
 *
 * NOT touched, deliberately:
 *   form_entries.answers  registration attachments live under ENTRY_PREFIX,
 *                             are never given a public URL, and leave only
 *                             through an authenticated route that streams them.
 *                             They have no host in them to rewrite.
 *   enquiries                 nothing renders a URL out of a stranger's message.
 *   tracks.svg_path           an inline SVG `d` attribute, not an address.
 *
 * `updated_at` is left alone. The admin screens read it as "somebody edited
 * this", and re-addressing the same photograph is not an edit — the pictures
 * are identical, only the road to them changed.
 *
 * ── Life expectancy ───────────────────────────────────────────────────────
 *
 * One-shot, and it outlived the schema it was written against: 0001 moved these
 * tables into the `ctr` schema and dropped the prefix while this had not yet
 * been run. So each table is looked up at run time and answers to either name —
 * `ctr.content` if the baseline has been applied, `public.ctr_content` if not.
 *
 * That is the whole of the accommodation. Once this has run against production
 * it is spent: delete it rather than leaving a one-shot lying around looking
 * like a tool.
 */
import { neon } from "@neondatabase/serverless";

/** Every column that can hold one, and whether it has to go through ::text. */
const TARGETS = [
  {
    table: "content",
    what: "the landing and INCRC documents",
    columns: [{ name: "content", json: true }],
  },
  { table: "decks", what: "deck page images", columns: [{ name: "pages", json: true }] },
  {
    table: "sports",
    what: "sport logos and photos",
    columns: [{ name: "logo_url" }, { name: "photo_url" }],
  },
  {
    table: "tracks",
    what: "circuit photos, layout maps and related links",
    columns: [{ name: "photo_url" }, { name: "map_url" }, { name: "links", json: true }],
  },
  {
    table: "forms",
    what: "anything pasted into a form's questions or sections",
    columns: [{ name: "fields", json: true }, { name: "sections", json: true }],
  },
];

const DRY_RUN = process.argv.includes("--dry-run");

/** `--from=https://…`. Both ends can be overridden for a second CDN move. */
function flag(name) {
  const found = process.argv.find((argument) => argument.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : "";
}

const trimSlashes = (value) => value.replace(/\/+$/, "");

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.S3_REGION;

/*
 * The old address is the one publicUrl() used to build, and the new one is what
 * it builds now — same precedence, so the rows land on exactly the host the
 * next upload will get. Neither is written down in this file.
 */
const FROM = trimSlashes(
  flag("from") || (BUCKET && REGION ? `https://${BUCKET}.s3.${REGION}.amazonaws.com` : "")
);

const TO = trimSlashes(
  flag("to") || process.env.S3_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_MEDIA_BASE_URL || ""
);

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  fail("DATABASE_URL is not set. Make sure .env exists in the project root.");
}

if (!FROM) {
  fail(
    "Nothing to migrate FROM. Set S3_BUCKET and S3_REGION, or pass --from=https://old-host"
  );
}

if (!TO) {
  fail(
    "Nothing to migrate TO. Set NEXT_PUBLIC_MEDIA_BASE_URL, or pass --to=https://media.example.com"
  );
}

if (FROM === TO) {
  fail(`The old and new hosts are the same (${FROM}). Nothing to do.`);
}

/*
 * Re-running has to be a no-op, and it is: once a row says the new host it no
 * longer contains the old string. That only holds while the new host does not
 * CONTAIN the old one — "https://x.com" → "https://x.com.cdn.net" would eat
 * itself a second character deeper on every run. Refuse rather than corrupt.
 */
if (TO.includes(FROM)) {
  fail(`The new host contains the old one (${FROM} ⊂ ${TO}). That would not be idempotent.`);
}

const sql = neon(process.env.DATABASE_URL);

/**
 * Whichever of the two names this database answers to, fully qualified.
 *
 * `to_regclass` returns null rather than raising for a name that is not there,
 * which is what makes asking about both cheap. Null from both means the table
 * does not exist at all — a database this script has no business writing to.
 */
async function resolveTable(name) {
  const [row] = await sql.query(
    `SELECT coalesce(to_regclass('ctr.' || $1), to_regclass('public.ctr_' || $1))::text AS name`,
    [name]
  );

  return row.name;
}

/** `strpos`, not LIKE: the needle is a literal, and % and _ are not wildcards in it. */
const matches = (column) => `strpos(${column.json ? `${column.name}::text` : column.name}, $1) > 0`;

const rewrite = (column) =>
  column.json
    ? `${column.name} = replace(${column.name}::text, $1, $2)::jsonb`
    : `${column.name} = replace(${column.name}, $1, $2)`;

/**
 * Rows still carrying the old host, per column — and how many URLs are in them.
 *
 * The row count alone is not something anyone can eyeball: `content` is two
 * rows whatever happens, and the question is whether they hold the eleven
 * addresses you expect or one. Occurrences are counted the only way SQL offers,
 * by how much shorter the text gets with the needle taken out of it.
 *
 * Table and column names are the literals in TARGETS, never input; the needle
 * is a parameter.
 */
async function countMatches(table, columns) {
  return await Promise.all(
    columns.map(async (column) => {
      const text = column.json ? `${column.name}::text` : column.name;

      const [row] = await sql.query(
        `SELECT count(*)::int AS rows,
                coalesce(sum((length(${text}) - length(replace(${text}, $1, ''))) / length($1)), 0)::int AS hits
           FROM ${table}
          WHERE ${matches(column)}`,
        [FROM]
      );

      return { column: column.name, rows: row.rows, hits: row.hits };
    })
  );
}

console.log(DRY_RUN ? "DRY RUN — nothing will be written.\n" : "Rewriting media URLs.\n");
console.log(`  from  ${FROM}`);
console.log(`  to    ${TO}\n`);

try {
  let pending = 0;
  let urls = 0;
  let written = 0;

  for (const { table, what, columns } of TARGETS) {
    const resolved = await resolveTable(table);

    if (!resolved) {
      fail(`No ${table} table under either name. Is DATABASE_URL pointing at the right database?`);
    }

    const counts = await countMatches(resolved, columns);
    const total = counts.reduce((sum, count) => sum + count.rows, 0);
    const hits = counts.reduce((sum, count) => sum + count.hits, 0);
    pending += total;
    urls += hits;

    const detail = counts
      .filter((count) => count.rows > 0)
      .map((count) => `${count.column} ${count.rows}×${count.hits}`)
      .join(", ");

    if (total === 0) {
      console.log(`  ${resolved.padEnd(20)} —  nothing to do (${what})`);
      continue;
    }

    console.log(
      `  ${resolved.padEnd(20)} ${String(total).padStart(3)} row(s), ` +
        `${String(hits).padStart(3)} URL(s)  [${detail}]`
    );

    if (DRY_RUN) continue;

    // One statement per table: a row matching on two columns is updated once,
    // and a column that does not match is rewritten to the value it already has.
    const changed = await sql.query(
      `UPDATE ${resolved}
          SET ${columns.map(rewrite).join(", ")}
        WHERE ${columns.map(matches).join(" OR ")}
        RETURNING 1`,
      [FROM, TO]
    );

    written += changed.length;
  }

  console.log("");

  if (pending === 0) {
    console.log("Every row is already on the new host. Nothing changed.");
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log(
      `${pending} row(s) holding ${urls} URL(s) would be rewritten. ` +
        "Re-run without --dry-run to do it."
    );
    process.exit(0);
  }

  console.log(`Rewrote ${written} row(s), ${urls} URL(s).`);

  // Say it out of the database rather than out of the counters above, which is
  // the difference between "the statements ran" and "the rows changed".
  let left = 0;
  for (const { table, columns } of TARGETS) {
    const counts = await countMatches(await resolveTable(table), columns);
    left += counts.reduce((sum, count) => sum + count.rows, 0);
  }

  if (left > 0) {
    fail(`${left} row(s) still carry the old host. Something is wrong — do not lock the bucket.`);
  }

  console.log("Verified: no row carries the old host any more.");
} catch (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
