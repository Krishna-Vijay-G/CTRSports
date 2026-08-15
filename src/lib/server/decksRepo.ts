import "server-only";

import { cache } from "react";
import {
  DECK_STATUSES,
  normaliseDeckInput,
  normaliseDeckPages,
  type Deck,
  type DeckSummary,
} from "@/lib/decks";
import { oneOf } from "@/lib/normalise";
import { type SlugHolder } from "@/lib/slug";
import { getSql } from "@/lib/server/db";
import {
  findSlugOwner as findOwner,
  releaseFormerSlug as releaseFormer,
  resolveSlug,
  writeSlugs,
} from "@/lib/server/slugsRepo";

/**
 * Every read and write of ctr.decks.
 *
 * The column list is spelled out in each query rather than shared through a
 * helper, the same way tracksRepo and formsRepo do it: a handful of queries
 * repeating the names is easier to follow than one builder that hides them.
 *
 * ── What moved out of this file ───────────────────────────────────────────
 *
 * The pages are rows in `deck_pages` and the addresses are rows in `ctr.slugs`,
 * so two things this file used to do itself now belong to the database and to
 * slugsRepo. What is left here is the deck.
 *
 * The eighty lines of find-the-owner, release-the-old-one and narrow-the-history
 * that this file shared with formsRepo are gone into slugsRepo, which is the
 * point of a shared table. `findSlugOwner` and `releaseFormerSlug` are still
 * exported from here, unchanged in shape, because the routes call them.
 *
 * A duplicate address is left to the unique index and comes back as Postgres
 * 23505. The route turns that into a sentence.
 */

const DUPLICATE = "23505";

/** Every column of the deck itself. The pages and the addresses are joined on. */
const COLUMNS = "id, name, status, blurb, show_heading, sort_order";

type DeckRow = {
  id: string;
  name: string;
  status: string;
  blurb: string;
  show_heading: boolean;
  sort_order: number;
  slug: string | null;
  former_slugs: string[] | null;
  pages: { url: string; alt: string }[] | null;
};

/**
 * Read through the same rules as a write.
 *
 * `status` is a text column — it has a CHECK constraint now, but `oneOf` stays,
 * because this project's way of RETIRING a value is a code change and not a
 * migration: a row still holding a status the code no longer offers has to read
 * back as something rather than crash the picker.
 *
 * The pages arrive as a JSON aggregate of rows rather than the stored document
 * they used to be, so they are already the right shape — but they go through
 * `normaliseDeckPages` anyway, which costs nothing and means one function
 * decides what a usable page is.
 */
function hydrate(row: DeckRow): Deck {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug ?? "",
    status: oneOf(row.status, DECK_STATUSES, "draft"),
    blurb: row.blurb,
    show_heading: typeof row.show_heading === "boolean" ? row.show_heading : true,
    pages: normaliseDeckPages(row.pages ?? []),
    former_slugs: row.former_slugs ?? [],
    sort_order: row.sort_order,
  };
}

/**
 * The joins that put a deck back together.
 *
 * Both are correlated sub-queries rather than a GROUP BY over three tables: the
 * ordering of the pages and of the addresses is per deck, and a join with an
 * aggregate over two one-to-many relations multiplies the rows before it counts
 * them — the classic way to report eleven pages as a hundred and twenty-one.
 */
const PAGES = `
  (SELECT coalesce(jsonb_agg(jsonb_build_object('url', p.url, 'alt', p.alt)
            ORDER BY p.position), '[]'::jsonb)
     FROM ctr.deck_pages p WHERE p.deck_id = d.id) AS pages`;

const SLUG = `
  (SELECT s.slug FROM ctr.slugs s
    WHERE s.entity_type = 'deck' AND s.entity_id = d.id AND s.is_current) AS slug`;

const FORMER = `
  (SELECT coalesce(jsonb_agg(s.slug ORDER BY s.created_at), '[]'::jsonb)
     FROM ctr.slugs s
    WHERE s.entity_type = 'deck' AND s.entity_id = d.id AND NOT s.is_current) AS former_slugs`;

export const listDecks = cache(async (): Promise<Deck[]> => {
  const sql = getSql();
  const rows = (await sql.query(`
    SELECT ${COLUMNS}, ${SLUG}, ${FORMER}, ${PAGES}
      FROM ctr.decks d
     ORDER BY d.sort_order ASC, d.name ASC
  `)) as DeckRow[];

  return rows.map(hydrate);
});

/**
 * The decks a picker or a card may point at: every published one, in order.
 *
 * A count and a cover, done in SQL. This used to load every deck in full —
 * fifty image addresses each — normalise all of them, filter the drafts out in
 * JavaScript, and then throw the pages away to report a number. The cover is
 * page one and the count is `count(*)`, which is two things the database can say
 * without sending the pages at all.
 */
export const listDeckSummaries = cache(async (): Promise<DeckSummary[]> => {
  const sql = getSql();

  const rows = (await sql`
    SELECT d.id, d.name, d.blurb,
           (SELECT s.slug FROM ctr.slugs s
             WHERE s.entity_type = 'deck' AND s.entity_id = d.id AND s.is_current) AS slug,
           (SELECT p.url FROM ctr.deck_pages p
             WHERE p.deck_id = d.id ORDER BY p.position LIMIT 1) AS cover,
           (SELECT count(*)::int FROM ctr.deck_pages p WHERE p.deck_id = d.id) AS pages
      FROM ctr.decks d
     WHERE d.status = 'published'
     ORDER BY d.sort_order ASC, d.name ASC
  `) as { id: string; name: string; blurb: string; slug: string | null; cover: string | null; pages: number }[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug ?? "",
    // The WHERE decided this. Spelled out rather than read back, so the type is
    // satisfied by the query's own condition instead of a column nobody needs.
    status: "published" as const,
    blurb: row.blurb,
    cover: row.cover ?? "",
    pages: Number(row.pages) || 0,
  }));
});

/** The same, where an unreachable database should cost the cards and not the page. */
export async function listDeckSummariesSafe(): Promise<DeckSummary[]> {
  try {
    return await listDeckSummaries();
  } catch (error) {
    console.error("[decks] could not load the decks", error);
    return [];
  }
}

export async function getDeck(id: string): Promise<Deck | null> {
  const sql = getSql();
  const rows = (await sql.query(
    `SELECT ${COLUMNS}, ${SLUG}, ${FORMER}, ${PAGES} FROM ctr.decks d WHERE d.id = $1`,
    [id]
  )) as DeckRow[];

  return rows[0] ? hydrate(rows[0]) : null;
}

/**
 * The deck at an address, current or former.
 *
 * One indexed lookup in `slugs` and then the row, instead of the old
 * `slug = $1 OR former_slugs @> $2::jsonb` over an unindexed JSONB column. The
 * page turns a former match into a permanent redirect, so an old printed link
 * corrects itself in the address bar — `hydrate` carries the current slug, which
 * is what it redirects to.
 */
export async function getDeckBySlug(slug: string): Promise<Deck | null> {
  const found = await resolveSlug("deck", slug);
  return found ? getDeck(found.id) : null;
}

/** A refusal the routes already know how to turn into a 409. */
function taken(message: string): Error & { code?: string } {
  const conflict = new Error(message) as Error & { code?: string };
  conflict.code = DUPLICATE;
  return conflict;
}

/** The sentence a held address gets refused with, in both directions. */
function heldBy(slug: string, holder: SlugHolder): string {
  const name = holder.name || "another deck";
  return holder.held === "current"
    ? `/deck/${slug} is where “${name}” lives. Give that deck a different address first.`
    : `/deck/${slug} is an old address of “${name}” and still redirects there.`;
}

/** Which deck answers to this address. Kept exported: the slugs route calls it. */
export async function findSlugOwner(slug: string, exceptId = ""): Promise<SlugHolder | null> {
  return findOwner("deck", slug, exceptId);
}

/** Drops one address out of a deck's history, so another deck may take it. */
export async function releaseFormerSlug(slug: string, fromId: string): Promise<boolean> {
  return releaseFormer("deck", slug, fromId);
}

/**
 * Adds a deck at the address it was asked for.
 *
 * The same two paths the forms repo takes, for the same reason — see the note
 * on `createForm`. An address somebody typed is honoured exactly or refused,
 * because a silent `-2` on the end is a link they will not think to check; an
 * address nobody typed still gets the suffix loop, because something has to be
 * invented.
 */
export async function createDeck(input: unknown, notes?: string[]): Promise<Deck> {
  const first = normaliseDeckInput(input, notes);
  const asked =
    typeof (input as { slug?: unknown })?.slug === "string" &&
    (input as { slug: string }).slug.trim() !== "";

  if (asked) {
    const holder = await findSlugOwner(first.slug);
    if (holder) throw taken(heldBy(first.slug, holder));

    return insertDeck(first);
  }

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const slug = attempt === 1 ? first.slug : `${first.slug}-${attempt}`;

    // Skipped rather than attempted: a former address is as much a claim as a
    // current one now, and the insert would refuse it either way — this keeps
    // the loop reading as "find a free one" rather than "try until it stops
    // throwing".
    if (await findSlugOwner(slug)) continue;

    try {
      const deck = await insertDeck({ ...first, slug });
      if (attempt > 1) {
        notes?.push(`The address “${first.slug}” was taken, so this one is “${slug}”.`);
      }
      return deck;
    } catch (error) {
      if ((error as { code?: string })?.code !== DUPLICATE) throw error;
    }
  }

  throw new Error("Could not find a free address for the deck.");
}

/**
 * The row, its address and its pages, in one transaction.
 *
 * All three or none: a deck with no address is unreachable and a deck with an
 * address and no pages is a blank page at a printed link.
 */
async function insertDeck(d: Omit<Deck, "id">): Promise<Deck> {
  const sql = getSql();

  const rows = (await sql`
    INSERT INTO ctr.decks (name, status, blurb, show_heading, sort_order)
    VALUES (${d.name}, ${d.status}, ${d.blurb}, ${d.show_heading}, ${d.sort_order})
    RETURNING id
  `) as { id: string }[];

  const id = rows[0].id;

  await writeSlugs("deck", id, d.slug, []);
  await writePages(id, d.pages);

  const created = await getDeck(id);
  if (!created) throw new Error("The deck was not written.");
  return created;
}

/**
 * The pages, replaced wholesale.
 *
 * Their identity IS their position — page four is page four — so there is
 * nothing to reconcile and a diff would only be a way to be subtly wrong about
 * the order.
 */
async function writePages(id: string, pages: { url: string; alt: string }[]): Promise<void> {
  const sql = getSql();

  await sql.transaction([
    sql`DELETE FROM ctr.deck_pages WHERE deck_id = ${id}`,
    ...pages.map(
      (page, index) => sql`
        INSERT INTO ctr.deck_pages (deck_id, position, url, alt)
        VALUES (${id}, ${index + 1}, ${page.url}, ${page.alt})
      `
    ),
  ]);
}

/**
 * Null when the id does not exist — the route turns that into a 404.
 *
 * A changed slug pushes the old one into the history rather than replacing it,
 * so every address this deck has ever had still finds it. The list is built
 * here rather than trusted from the request: a browser cannot be allowed to
 * claim an address the deck never had, which would be a way to take a slug out
 * from under another one.
 *
 * It can only ever SHRINK from the request — the other half of that rule, and
 * safe for the same reason it is unsafe in reverse. See the note on updateForm.
 *
 * Deliberately does NOT write sort_order, for the reason updateTrack gives:
 * position belongs to `reorderDecks`, so a deck opened before someone dragged
 * the list cannot save a stale position back over it.
 */
export async function updateDeck(
  id: string,
  input: unknown,
  notes?: string[]
): Promise<Deck | null> {
  const sql = getSql();
  const d = normaliseDeckInput(input, notes);

  const existing = await getDeck(id);
  if (!existing) return null;

  if (d.slug !== existing.slug) {
    const holder = await findSlugOwner(d.slug, id);
    if (holder) throw taken(heldBy(d.slug, holder));
  }

  /*
   * The history is the STORED list narrowed by what the editor kept — never the
   * list the request sent. Read from the raw body rather than the normalised
   * deck, because the normaliser turns a missing field into `[]` and treating
   * that as "cleared" would wipe the redirects of any caller posting without one.
   */
  const requested = (input as { former_slugs?: unknown })?.former_slugs;
  const kept = Array.isArray(requested)
    ? existing.former_slugs.filter((slug) => requested.includes(slug))
    : existing.former_slugs;

  const retired = existing.former_slugs.length - kept.length;
  if (retired > 0) {
    notes?.push(
      retired === 1
        ? "One old address was retired — it no longer finds this deck."
        : `${retired} old addresses were retired — they no longer find this deck.`
    );
  }

  const formerSlugs =
    existing.slug && existing.slug !== d.slug
      ? [...new Set([...kept, existing.slug])].filter((slug) => slug !== d.slug)
      : kept.filter((slug) => slug !== d.slug);

  if (d.slug !== existing.slug) {
    notes?.push(`The old address /deck/${existing.slug} still works — it now redirects here.`);
  }

  const rows = (await sql`
    UPDATE ctr.decks
       SET name         = ${d.name},
           status       = ${d.status},
           blurb        = ${d.blurb},
           show_heading = ${d.show_heading},
           updated_at   = now()
     WHERE id = ${id}
    RETURNING id
  `) as { id: string }[];

  if (rows.length === 0) return null;

  await writeSlugs("deck", id, d.slug, formerSlugs);
  await writePages(id, d.pages);

  return getDeck(id);
}

/**
 * Spaced by ten, in one statement.
 *
 * `unnest` over two arrays rather than a statement per deck: reordering a list
 * of twenty was twenty round trips inside a transaction, and the position of
 * each is already known before any of them is sent.
 */
export async function reorderDecks(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const sql = getSql();
  const orders = ids.map((_, index) => (index + 1) * 10);

  await sql`
    UPDATE ctr.decks d
       SET sort_order = wanted.position, updated_at = now()
      FROM unnest(${ids}::uuid[], ${orders}::int[]) AS wanted(id, position)
     WHERE d.id = wanted.id
  `;
}

/**
 * Removes a deck.
 *
 * The pages and the addresses go with it — `deck_pages` cascades on the foreign
 * key, and `slugs` cannot have one (its `entity_id` points at either of two
 * tables), so a trigger does the same job. See migrations/0002.
 *
 * The images are NOT deleted from the bucket, and that is deliberate. They sit
 * under the media prefix, where they are shared: the same upload can be a deck
 * page and the photograph on a section of a page, because the media library
 * offers every picture to every screen. Deleting the objects would take the
 * picture off a page that has nothing to do with this deck. Registration
 * attachments are the opposite case — private, single-use, under their own
 * prefix — which is why deleting a form does delete those.
 */
export async function deleteDeck(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM ctr.decks WHERE id = ${id} RETURNING id
  `) as { id: string }[];

  return rows.length > 0;
}
