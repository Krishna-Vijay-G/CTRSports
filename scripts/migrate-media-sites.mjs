/**
 * Moves the media folders that were named after a MODULE under the SITE that
 * owns their records.
 *
 *   npm run migrate:media:sites -- --dry-run     say what would move
 *   npm run migrate:media:sites                  move it
 *
 *   ctr-sports/media/decks/<record>/…     →  ctr-sports/media/<site>/decks/<record>/…
 *   ctr-sports/media/circuits/<record>/…  →  ctr-sports/media/<site>/circuits/<record>/…
 *   ctr-sports/media/articles/<record>/…  →  ctr-sports/media/<site>/articles/<record>/…
 *
 * ── Why this is needed at all ─────────────────────────────────────────────
 *
 * `decks/`, `circuits/` and `articles/` are top-level folders from when there
 * was one sport and "whose deck is this?" had one answer. Phase 1 made a sport a
 * row and every record took a `site_id`; the FOLDERS did not follow, so
 * `mediaPaths.ts` carried a second permission rule for them —
 * `canEditAnywhere`, "may this account edit that module on any site?" — which
 * with two sports would let a pickleball admin into the championship's media
 * pack. This is the move that lets that rule be deleted, and it is deleted.
 *
 * ── The ordering, which is the whole difficulty ───────────────────────────
 *
 * The same one `entityMedia.ts` argues for, because S3 has no rename and no
 * transaction:
 *
 *     copy  →  re-address the database  →  delete the originals
 *
 * A failure at any point leaves duplicate objects and a database pointing at one
 * consistent set of them. Duplicates are recoverable — re-run, or sweep later.
 * Deleting before re-addressing leaves rows pointing at keys that are gone,
 * which is a broken picture on a live page with nothing to reconstruct it from.
 *
 * Re-running is a no-op: once a row says the new prefix it no longer contains
 * the old one, and once the old objects are gone there is nothing left to list.
 *
 * ── Which site each folder goes to ────────────────────────────────────────
 *
 * Asked of the database, folder by folder, never assumed. An entity folder is
 * named `entitySegment(slug, id)` — the record's address, or a truncation of it
 * with eight hex digits of its id on the end — so this rebuilds that name for
 * every deck, circuit and article and matches on it. The site is then that
 * record's own.
 *
 * A folder matching NO record is left exactly where it is and reported. It is
 * either a record deleted without its folder being tidied, or something a person
 * made by hand, and neither has a site to be moved to — guessing one would file
 * somebody's pictures under a sport that has no claim to them.
 *
 * ── What it does not touch ────────────────────────────────────────────────
 *
 *   the loose objects at the media root   uploads from before folders existed,
 *                                         unattributed and un-attributable. The
 *                                         decision is recorded in
 *                                         docs/uploads by folder structure.md.
 *   uploads/                              shared by construction; it is where a
 *                                         deleted record's still-referenced
 *                                         files are rescued TO.
 *   landing/, incrc/, <any site>/         already where they belong.
 *   ctr-sports/entries/                   a different prefix. Registration
 *                                         attachments are not media and this
 *                                         script cannot name them.
 *
 * ── Life expectancy ───────────────────────────────────────────────────────
 *
 * One-shot. Once it has run against production it is spent: delete it rather
 * than leaving it lying around looking like a tool.
 */
import {
  CopyObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";
import { neon } from "@neondatabase/serverless";

const MEDIA_PREFIX = "ctr-sports/media/";

/** The three roots, and the table whose records name the folders inside them. */
const ROOTS = [
  { root: "decks", table: "decks", slug: "deck" },
  { root: "circuits", table: "tracks", slug: null },
  { root: "articles", table: "articles", slug: "article" },
];

const DRY_RUN = process.argv.includes("--dry-run");

function fail(message) {
  console.error(message);
  process.exit(1);
}

for (const name of ["DATABASE_URL", "S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"]) {
  if (!process.env[name]) fail(`${name} is not set. Make sure .env exists in the project root.`);
}

const BUCKET = process.env.S3_BUCKET;
const sql = neon(process.env.DATABASE_URL);
const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  },
});

/* ─────────────────── The folder name a record would have ────────────────── */

const MAX_SEGMENT = 48;
const RESERVED = new Set(["entries", "media", "con", "prn", "aux", "nul"]);
const SEGMENT = /^[A-Za-z0-9](?:[A-Za-z0-9 _-]*[A-Za-z0-9_-])?$/;

/**
 * `parseSegment` and `entitySegment` from src/lib/mediaPaths.ts, copied.
 *
 * Copied rather than imported, and that is the one duplication in this file
 * worth defending: this is a `.mjs` script run by plain node, and the original
 * is TypeScript behind a path alias. Importing it would mean a build step for a
 * one-shot. The risk the duplication carries is bounded by the script being a
 * one-shot too — it runs against one bucket, once, and is deleted — and by
 * every folder it cannot match being reported rather than moved.
 */
function parseSegment(raw) {
  if (typeof raw !== "string") return null;
  const name = raw.trim().replace(/ {2,}/g, " ");
  if (name.length < 1 || name.length > MAX_SEGMENT) return null;
  if (!SEGMENT.test(name)) return null;
  if (RESERVED.has(name.toLowerCase())) return null;
  return name;
}

function entitySegment(slug, id) {
  if (slug.length <= MAX_SEGMENT) {
    const direct = parseSegment(slug);
    if (direct !== null) return direct;
  }

  const short = id.replace(/[^a-z0-9]/gi, "").slice(0, 8).toLowerCase() || "record";
  const head = slug.slice(0, Math.max(MAX_SEGMENT - short.length - 1, 0)).replace(/-+$/, "");

  return parseSegment(head ? `${head}-${short}` : short) ?? short;
}

/* ─────────────────────────────── The bucket ─────────────────────────────── */

/** Every key under a prefix, paged. */
async function listUnder(prefix) {
  const keys = [];
  let token;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: token,
        MaxKeys: 1000,
      })
    );

    for (const object of page.Contents ?? []) keys.push(object.Key);
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  return keys;
}

/** Ten at a time: sequential is slow and unbounded is a burst of signed requests. */
async function copyAll(pairs) {
  for (let at = 0; at < pairs.length; at += 10) {
    await Promise.all(
      pairs.slice(at, at + 10).map(([from, to]) =>
        s3.send(
          new CopyObjectCommand({
            Bucket: BUCKET,
            // The source is `bucket/key`, and every character that is special in
            // a URL has to be escaped — a key with a space in it is otherwise
            // "NoSuchKey" for a key that is plainly there.
            CopySource: encodeURI(`${BUCKET}/${from}`),
            Key: to,
            MetadataDirective: "COPY",
          })
        )
      )
    );
  }
}

async function deleteAll(keys) {
  for (let at = 0; at < keys.length; at += 1000) {
    await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: keys.slice(at, at + 1000).map((Key) => ({ Key })), Quiet: true },
      })
    );
  }
}

/* ──────────────────────────── The database ──────────────────────────────── */

/**
 * Every column that can hold an image address, which is the same list
 * `src/lib/server/mediaRefs.ts` rewrites and `mediaUsage.ts` scans.
 *
 * The JSONB ones go through their text form, which is safe because a key
 * contains no character JSON escapes and `jsonb` is normalised on storage — the
 * round trip changes the string and nothing else.
 *
 * `form_entries.answers` is deliberately absent: registration attachments live
 * under `ENTRY_PREFIX`, a sibling of the media prefix that no key here can name.
 */
const COLUMNS = [
  ["page_sections", [["data", true]]],
  ["banners", [["image", false]]],
  ["posts", [["image", false]]],
  ["partners", [["logo", false]]],
  ["deck_pages", [["url", false]]],
  ["sports", [["logo_url", false], ["photo_url", false]]],
  ["tracks", [["photo_url", false], ["map_url", false]]],
  ["track_links", [["href", false]]],
  ["forms", [["fields", true], ["sections", true]]],
  ["articles", [["cover_image", false], ["body", true]]],
  ["events", [["cover_image", false], ["body", true]]],
];

const asText = (name, json) => (json ? `${name}::text` : name);

/** How many rows hold this prefix, and how many times in total. */
async function countRefs(from) {
  let rows = 0;
  let hits = 0;

  for (const [table, columns] of COLUMNS) {
    for (const [name, json] of columns) {
      const text = asText(name, json);
      const [row] = await sql.query(
        `SELECT count(*)::int AS rows,
                coalesce(sum((length(${text}) - length(replace(${text}, $1, ''))) / length($1)), 0)::int AS hits
           FROM ctr.${table} WHERE strpos(${text}, $1) > 0`,
        [from]
      );
      rows += row.rows;
      hits += row.hits;
    }
  }

  return { rows, hits };
}

/** Points every reference at the new prefix. Returns how many rows changed. */
async function rewriteRefs(from, to) {
  let changed = 0;

  for (const [table, columns] of COLUMNS) {
    const sets = columns
      .map(([name, json]) =>
        json
          ? `${name} = replace(${name}::text, $1, $2)::jsonb`
          : `${name} = replace(${name}, $1, $2)`
      )
      .join(", ");

    const where = columns.map(([name, json]) => `strpos(${asText(name, json)}, $1) > 0`).join(" OR ");

    // `updated_at` is left alone throughout. The admin screens read it as
    // "somebody edited this", and re-addressing the same photograph is not an
    // edit — the pictures are identical, only the road to them changed.
    const rows = await sql.query(
      `UPDATE ctr.${table} SET ${sets} WHERE ${where} RETURNING 1`,
      [from, to]
    );

    changed += rows.length;
  }

  return changed;
}

/* ────────────────────────────── The plan ────────────────────────────────── */

/**
 * Which site each folder under a legacy root belongs to.
 *
 * A circuit has no `ctr.slugs` row — its address is `tracks.slug`, a plain
 * column — which is why the query is per table rather than one join through the
 * slug registry.
 */
async function ownersFor({ root, table, slug }) {
  const rows =
    slug === null
      ? await sql.query(
          `SELECT t.id, t.slug, s.slug AS site
             FROM ctr.${table} t JOIN ctr.sites s ON s.id = t.site_id`
        )
      : await sql.query(
          `SELECT r.id,
                  (SELECT sl.slug FROM ctr.slugs sl
                    WHERE sl.entity_type = $1 AND sl.entity_id = r.id AND sl.is_current) AS slug,
                  s.slug AS site
             FROM ctr.${table} r JOIN ctr.sites s ON s.id = r.site_id`,
          [slug]
        );

  const byFolder = new Map();
  for (const row of rows) {
    if (!row.slug) continue;
    byFolder.set(entitySegment(row.slug, row.id), { site: row.site, root });
  }

  return byFolder;
}

console.log(DRY_RUN ? "DRY RUN — nothing will be copied, written or deleted.\n" : "Moving media folders under their sites.\n");

try {
  let moved = 0;
  let copied = 0;
  let orphans = 0;

  for (const target of ROOTS) {
    const prefix = `${MEDIA_PREFIX}${target.root}/`;
    const keys = await listUnder(prefix);

    if (keys.length === 0) {
      console.log(`  ${target.root.padEnd(10)} —  nothing under ${prefix}`);
      continue;
    }

    const owners = await ownersFor(target);

    /* Group the keys by the entity folder they sit in. */
    const groups = new Map();
    for (const key of keys) {
      const rest = key.slice(prefix.length);
      const folder = rest.includes("/") ? rest.split("/")[0] : rest.replace(/\/$/, "");
      if (!folder) continue;
      if (!groups.has(folder)) groups.set(folder, []);
      groups.get(folder).push(key);
    }

    console.log(`  ${target.root.padEnd(10)} ${groups.size} folder(s), ${keys.length} object(s)`);

    for (const [folder, group] of [...groups].sort()) {
      const owner = owners.get(folder);

      if (!owner) {
        orphans += 1;
        console.log(
          `     ${folder.padEnd(40)} LEFT WHERE IT IS — no ${target.table.replace(/s$/, "")} answers to it`
        );
        continue;
      }

      const from = `${prefix}${folder}/`;
      const to = `${MEDIA_PREFIX}${owner.site}/${target.root}/${folder}/`;
      const files = group.filter((key) => !key.endsWith("/"));

      console.log(`     ${folder.padEnd(40)} → ${owner.site}/${target.root}/  (${files.length} file(s))`);

      if (DRY_RUN) {
        const { rows, hits } = await countRefs(from);
        if (rows > 0) console.log(`        ${rows} row(s) hold ${hits} reference(s) to it`);
        moved += 1;
        copied += files.length;
        continue;
      }

      // copy → re-address → delete. See the note at the top.
      await copyAll(group.map((key) => [key, `${to}${key.slice(from.length)}`]));
      const rows = await rewriteRefs(from, to);
      await deleteAll(group);

      moved += 1;
      copied += files.length;
      if (rows > 0) console.log(`        re-addressed ${rows} row(s)`);
    }
  }

  console.log("");

  if (moved === 0) {
    console.log("Nothing to move — every media folder is already under its site.");
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log(`${moved} folder(s) holding ${copied} file(s) would move. Re-run without --dry-run.`);
    if (orphans > 0) console.log(`${orphans} folder(s) match no record and would be left alone.`);
    process.exit(0);
  }

  console.log(`Moved ${moved} folder(s), ${copied} file(s).`);
  if (orphans > 0) {
    console.log(`${orphans} folder(s) matched no record and were left where they are.`);
  }

  /*
   * Said out of the bucket and the database rather than out of the counters
   * above, which is the difference between "the statements ran" and "the objects
   * moved". An orphan folder legitimately survives, so the check is that nothing
   * MOVABLE is left and that no row still points at a moved prefix.
   */
  let left = 0;
  for (const target of ROOTS) {
    const prefix = `${MEDIA_PREFIX}${target.root}/`;
    const keys = await listUnder(prefix);
    const owners = await ownersFor(target);

    for (const key of keys) {
      const rest = key.slice(prefix.length);
      const folder = rest.includes("/") ? rest.split("/")[0] : rest.replace(/\/$/, "");
      if (folder && owners.has(folder)) left += 1;
    }

    const { rows } = await countRefs(prefix);
    if (rows > 0) {
      fail(`${rows} row(s) still point into ${prefix}. Do not delete anything by hand — re-run this.`);
    }
  }

  if (left > 0) {
    fail(`${left} object(s) are still under a legacy root and have a record. Re-run this.`);
  }

  console.log("Verified: nothing movable is left under decks/, circuits/ or articles/.");
} catch (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
