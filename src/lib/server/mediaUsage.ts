import "server-only";

import { PAGE_KEYS, PAGE_LABELS, type PageKey } from "@/lib/roles";
import { getSql } from "@/lib/server/db";

/**
 * What points at an uploaded file, before anybody deletes it.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * Deleting an object does not un-break a page. `max-age=31536000, immutable`
 * means a browser or a CDN may go on serving a deleted file for up to a year,
 * so a delete has no visible effect at all and then, months later, a picture
 * vanishes from a page nobody was editing. There is no undo and no obvious
 * cause. That gap between the action and the consequence is why this scan is
 * mandatory rather than advisory, and why the dialog in front of it says so in
 * words rather than a warning triangle.
 *
 * ── Why it pulls the text once instead of querying per key ────────────────
 *
 * The obvious shape is a `LIKE` per key, UNION'd. That is one round trip per
 * key through the Neon HTTP driver, so deleting a folder of two hundred files
 * would be two hundred round trips. Inverted here: pull the candidate columns
 * once, match in memory, resolve ids to names in the same pass. **Seven queries
 * total, however many keys are asked about.**
 *
 * Safe HERE AND ONLY HERE because these tables are tiny by construction —
 * `page_sections` is two pages' worth of sections, and the rest are
 * hand-curated lists of tens. If any of them ever grows past a few thousand
 * rows, switch to the per-key form; the `console.warn` below is what makes the
 * day that happens visible instead of gradual.
 *
 * ── What changed with the restructure ─────────────────────────────────────
 *
 * This was specified against the old schema: five queries over `ctr_content`,
 * `ctr_decks`, `ctr_sports`, `ctr_tracks` and `ctr_forms`, pulling whole JSONB
 * blobs as text. Four of those tables no longer hold URLs — `content` does not
 * exist, deck pages are rows, track links are rows. So the scan follows the
 * data:
 *
 *   page_sections.data   still a document, still matched as text
 *   banners.image        an exact-match column now
 *   posts.image          "
 *   partners.logo        "
 *   deck_pages.url       "
 *   sports               logo_url and photo_url, as before
 *   tracks               photo_url and map_url; links moved to track_links.href
 *   forms                fields and sections stay JSONB, so still text
 *
 * The originally-stated reasoning — "pull the text once, match in memory" —
 * therefore only applies to the three that are still documents. The rest are
 * ordinary indexed columns and a URL either equals one or does not, so those
 * are matched with `= ANY($1)` and the database does the work. That is a better
 * scan than the one specified, not a compromise on it.
 *
 * ── Two things it cannot do ───────────────────────────────────────────────
 *
 * It is a SNAPSHOT, not a lock. Somebody can save a page referencing a file
 * between the scan and the delete. The window is seconds, and the delete route
 * re-checks on confirm and answers 409 again if it changed — but there is no
 * advisory-lock mechanism anywhere in this app and this is not the place to
 * invent one.
 *
 * And it can only see THIS database. Not
 * a URL somebody pasted into an external document, an email, or the older CTR
 * site. Which is why the dialog says "nothing on this site points at these"
 * rather than "this is unused".
 */

export type UsageRef = {
  kind: "content" | "deck" | "sport" | "track" | "form" | "source";
  label: string;
  /**
   * The page editor this reference belongs to, or null for one that belongs to
   * no page.
   *
   * Carried so a delete can be REFUSED rather than merely warned about. Folder
   * permission stops a decks editor reaching into `landing/`; it does not stop
   * them deleting a file out of their own folder that the INCRC page happens to
   * use, because the media library offers every picture to every screen. This
   * field is what closes that: you may confirm past a usage warning only if
   * every page named is one you administer. See `canOverrideUsage`.
   *
   * Null is deliberately the STRICTEST value, not the most permissive — a form
   * belongs to the registrations admin, who cannot reach the media library at
   * all, so only an owner can override one.
   */
  page: PageKey | null;
};

export type KeyUsage = { key: string; refs: UsageRef[] };

/** Past this, the pull-it-all-in-memory bet stops being a good one. */
const TOO_MANY = 2000;
let warned = false;

/**
 * A `page_key` column narrowed to a page editor, or null for one nobody edits.
 *
 * `ctr.pages` is a lookup table and can hold a key `PAGE_KEYS` does not, so this
 * is a check rather than a cast: an unrecognised page reads as "no editor owns
 * this", which makes it overridable by an owner alone. Unknown means stricter,
 * never looser — the same posture `normaliseRole` takes.
 */
function pageKeyOf(value: string): PageKey | null {
  return (PAGE_KEYS as readonly string[]).includes(value) ? (value as PageKey) : null;
}

/**
 * Nothing is pinned from the source any more, and there is nothing left to pin.
 *
 * This used to walk `src/config/images.ts` — three tables of photography the
 * pages fell back to — and pin any upload among them, because a database-only
 * scan called them unreferenced and deleting one broke the site during an
 * outage, when nobody could see why.
 *
 * Those tables are gone. Every photograph on both pages is a row now, seeded
 * from scripts/seed-data/*.json, so the database scan below already sees all of
 * them: a picture in use is a picture some row points at, with no second list to
 * keep in step. What remains in that file is one /public placeholder, which is
 * not an upload and cannot be deleted from the media library.
 *
 * Kept as a function rather than deleted outright because the caller's shape is
 * "everything the database knows, plus everything the code does" — and the day
 * something is referenced from the source again, this is where it says so.
 */
function sourcePinnedKeys(): Set<string> {
  return new Set<string>();
}

/**
 * Everything that points at any of these keys.
 *
 * Batch only. A single-key variant would be `findUsage([key])[0]` and a second
 * entry point is a second thing to keep in step with this one.
 *
 * The needle is the KEY, never the URL. `publicUrl` appends the whole key to
 * whatever base it has, so dropping the host is what makes this survive a CDN
 * being put in front of the bucket — which has since happened. `encodeURI` is
 * matched as well, as insurance for a legacy object; the key charset never
 * percent-encodes, so it can only ever be belt and braces.
 */
export async function findUsage(keys: string[]): Promise<KeyUsage[]> {
  const wanted = [...new Set(keys.filter((key) => typeof key === "string" && key))];
  if (wanted.length === 0) return [];

  const sql = getSql();
  const encoded = wanted.map((key) => encodeURI(key));

  const [sections, banners, posts, partners, deckPages, columns, documents] = await Promise.all([
    sql`SELECT page_key, section_id, data::text AS blob FROM ctr.page_sections`,

    sql`SELECT b.page_key, b.image AS url FROM ctr.banners b
         WHERE b.image = ANY(${wanted}::text[]) OR b.image = ANY(${encoded}::text[])
            OR EXISTS (SELECT 1 FROM unnest(${wanted}::text[]) AS k(key)
                        WHERE position(k.key in b.image) > 0)`,

    sql`SELECT p.page_key, p.image AS url FROM ctr.posts p
         WHERE EXISTS (SELECT 1 FROM unnest(${wanted}::text[]) AS k(key)
                        WHERE position(k.key in p.image) > 0)`,

    sql`SELECT pr.page_key, pr.logo AS url FROM ctr.partners pr
         WHERE EXISTS (SELECT 1 FROM unnest(${wanted}::text[]) AS k(key)
                        WHERE position(k.key in pr.logo) > 0)`,

    sql`SELECT d.name, p.url FROM ctr.deck_pages p JOIN ctr.decks d ON d.id = p.deck_id
         WHERE EXISTS (SELECT 1 FROM unnest(${wanted}::text[]) AS k(key)
                        WHERE position(k.key in p.url) > 0)`,

    // The plain columns, all at once. Every one of these is a whole URL, so the
    // database can answer without anything being pulled into memory.
    sql`
      SELECT 'sport' AS kind, s.title AS label,
             coalesce(s.logo_url, '') || ' ' || coalesce(s.photo_url, '') AS blob
        FROM ctr.sports s
      UNION ALL
      SELECT 'track', t.name,
             coalesce(t.photo_url, '') || ' ' || coalesce(t.map_url, '')
        FROM ctr.tracks t
      UNION ALL
      SELECT 'track', t.name, l.href
        FROM ctr.track_links l JOIN ctr.tracks t ON t.id = l.track_id
    `,

    // `fields` and `sections` stay JSONB on purpose — a form definition is
    // written and read as one atomic unit — so a URL pasted into a question's
    // help text is inside a document and has to be matched as text.
    sql`SELECT name, fields::text || ' ' || sections::text AS blob FROM ctr.forms`,
  ]);

  const sectionRows = sections as { page_key: string; section_id: string; blob: string }[];
  const formRows = documents as { name: string; blob: string }[];

  if (!warned && (sectionRows.length > TOO_MANY || formRows.length > TOO_MANY)) {
    warned = true;
    console.warn(
      "[media] the usage scan pulls these tables into memory and they have grown past " +
        `${TOO_MANY} rows. Switch it to a per-key query.`
    );
  }

  const usage = new Map<string, UsageRef[]>(wanted.map((key) => [key, []]));

  const add = (key: string, ref: UsageRef): void => {
    const refs = usage.get(key);
    if (!refs) return;
    // One reference per place, however many times that place mentions it: a
    // deck listing the same image on three pages is one deck to the reader.
    if (!refs.some((seen) => seen.kind === ref.kind && seen.label === ref.label)) refs.push(ref);
  };

  /** The documents, matched in memory — the part that has to be. */
  const scan = (blob: unknown, ref: (key: string) => UsageRef): void => {
    const text = typeof blob === "string" ? blob : "";
    if (!text) return;

    for (let index = 0; index < wanted.length; index += 1) {
      if (text.includes(wanted[index]) || text.includes(encoded[index])) {
        add(wanted[index], ref(wanted[index]));
      }
    }
  };

  for (const row of sectionRows) {
    const page = PAGE_LABELS[row.page_key as keyof typeof PAGE_LABELS] ?? row.page_key;
    scan(row.blob, () => ({
      kind: "content",
      label: `${page} — ${row.section_id}`,
      page: pageKeyOf(row.page_key),
    }));
  }

  // A form belongs to the registrations admin, who has no media library at all,
  // so there is no page editor who can be said to own one.
  for (const row of formRows) {
    scan(row.blob, () => ({ kind: "form", label: `Form: ${row.name}`, page: null }));
  }

  for (const row of columns as { kind: string; label: string; blob: string }[]) {
    scan(row.blob, () => ({
      kind: row.kind === "sport" ? "sport" : "track",
      label: `${row.kind === "sport" ? "Sport" : "Circuit"}: ${row.label}`,
      // A sport is edited on the landing screen and a circuit on its own.
      page: row.kind === "sport" ? "landing" : "circuits",
    }));
  }

  /** The exact-match rows: the database already decided, so just attribute them. */
  const attribute = (
    rows: unknown[],
    urlOf: (row: never) => string,
    ref: (row: never) => UsageRef
  ): void => {
    for (const row of rows as never[]) {
      const url = urlOf(row);
      for (const key of wanted) {
        if (url.includes(key) || url.includes(encodeURI(key))) add(key, ref(row));
      }
    }
  };

  const pageLabel = (key: string): string =>
    PAGE_LABELS[key as keyof typeof PAGE_LABELS] ?? key;

  attribute(
    banners as unknown[],
    (row: { url: string }) => row.url,
    (row: { page_key: string }) => ({
      kind: "content",
      label: `${pageLabel(row.page_key)} — banner`,
      page: pageKeyOf(row.page_key),
    })
  );
  attribute(
    posts as unknown[],
    (row: { url: string }) => row.url,
    (row: { page_key: string }) => ({
      kind: "content",
      label: `${pageLabel(row.page_key)} — newsroom`,
      page: pageKeyOf(row.page_key),
    })
  );
  attribute(
    partners as unknown[],
    (row: { url: string }) => row.url,
    (row: { page_key: string }) => ({
      kind: "content",
      label: `${pageLabel(row.page_key)} — partners`,
      page: pageKeyOf(row.page_key),
    })
  );
  attribute(
    deckPages as unknown[],
    (row: { url: string }) => row.url,
    (row: { name: string }) => ({ kind: "deck", label: `Deck: ${row.name}`, page: "decks" })
  );

  /*
   * The source pins go on last and are checked FIRST by the delete route, so
   * turning them into a hard refusal later is one `if` rather than a rewrite.
   */
  const pinned = sourcePinnedKeys();
  for (const key of wanted) {
    if (pinned.has(key)) {
      // No page owns the source. Only an owner could ever override this one,
      // which is the right answer for a file the code itself depends on.
      add(key, { kind: "source", label: "Built into the code (src/config/images.ts)", page: null });
    }
  }

  return wanted.map((key) => ({ key, refs: usage.get(key) ?? [] }));
}
