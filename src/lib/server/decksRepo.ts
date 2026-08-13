import "server-only";

import {
  DECK_STATUSES,
  normaliseDeckInput,
  normaliseDeckPages,
  summariseDeck,
  type Deck,
  type DeckSummary,
} from "@/lib/decks";
import { oneOf } from "@/lib/normalise";
import { getSql } from "@/lib/server/db";

/**
 * Every read and write of ctr_decks.
 *
 * The column list is spelled out in each query rather than shared through a
 * helper, the same way tracksRepo and formsRepo do it: a handful of queries
 * repeating the names is easier to follow than one builder that hides them.
 *
 * Two things are borrowed from the forms repo, because a deck publishes at an
 * address the same way a form does:
 *
 * `getDeckBySlug` matches the CURRENT slug or any former one, which is what
 * makes a printed address keep working after a rename. The page turns a former
 * match into a permanent redirect, so the old link corrects itself in the bar.
 *
 * A duplicate slug is left to the unique index and comes back as Postgres
 * 23505. The route turns that into a sentence.
 */

const DUPLICATE = "23505";

/**
 * Read through the same rules as a write.
 *
 * `pages` is a JSONB document and `status` is plain text with no CHECK, so a
 * row written by an older version of this code — or by hand — is a shape the
 * current code has never seen. Normalising on write cannot help those rows,
 * because they are precisely the ones not being written.
 */
function hydrate(row: Deck): Deck {
  return {
    ...row,
    status: oneOf(row.status, DECK_STATUSES, "draft"),
    show_heading: typeof row.show_heading === "boolean" ? row.show_heading : true,
    pages: normaliseDeckPages(row.pages),
    former_slugs: Array.isArray(row.former_slugs)
      ? row.former_slugs.filter((slug): slug is string => typeof slug === "string")
      : [],
  };
}

export async function listDecks(): Promise<Deck[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, slug, status, blurb, show_heading, pages, former_slugs, sort_order
      FROM ctr_decks
     ORDER BY sort_order ASC, name ASC
  `) as Deck[];

  return rows.map(hydrate);
}

/**
 * The decks a picker or a card may point at: every published one, in order.
 *
 * Summaries rather than rows, so fifty image addresses per deck do not travel
 * into a page that wants a name and a cover. Drafts are left out everywhere
 * this is used — both callers put something on screen that a visitor will
 * click, and a draft is not on the internet at all.
 */
export async function listDeckSummaries(): Promise<DeckSummary[]> {
  const decks = await listDecks();
  return decks.filter((deck) => deck.status === "published").map(summariseDeck);
}

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
  const rows = (await sql`
    SELECT id, name, slug, status, blurb, show_heading, pages, former_slugs, sort_order
      FROM ctr_decks
     WHERE id = ${id}
  `) as Deck[];

  return rows[0] ? hydrate(rows[0]) : null;
}

/** The current slug first, then the former ones — see the note at the top. */
export async function getDeckBySlug(slug: string): Promise<Deck | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, slug, status, blurb, show_heading, pages, former_slugs, sort_order
      FROM ctr_decks
     WHERE slug = ${slug}
        OR former_slugs @> ${JSON.stringify([slug])}::jsonb
     ORDER BY (slug = ${slug}) DESC
     LIMIT 1
  `) as Deck[];

  return rows[0] ? hydrate(rows[0]) : null;
}

/**
 * Adds a deck, giving it an address nobody else has.
 *
 * Every new deck starts life called "New deck", which slugifies to `new-deck`,
 * which is `UNIQUE` — so pressing "Add deck" a second time would be a
 * guaranteed 409 about a link the admin never typed. Adding a suffix is what
 * they would have had to do by hand, so it is done for them and said out loud.
 */
export async function createDeck(input: unknown, notes?: string[]): Promise<Deck> {
  const first = normaliseDeckInput(input, notes);

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const slug = attempt === 1 ? first.slug : `${first.slug}-${attempt}`;

    try {
      const deck = await insertDeck({ ...first, slug });
      if (attempt > 1) {
        notes?.push(`The address “${first.slug}” was taken, so this one is “${slug}”.`);
      }
      return deck;
    } catch (error) {
      // Anything that is not "that address exists" is the caller's to handle.
      if ((error as { code?: string })?.code !== DUPLICATE) throw error;
    }
  }

  throw new Error("Could not find a free address for the deck.");
}

/**
 * Whether another deck still answers to this address.
 *
 * Same reasoning as the forms table: `former_slugs` is what makes a printed
 * link survive a rename, and handing the same address to a different deck would
 * quietly start opening somebody else's document. There is no unique index to
 * lean on here — the column is a JSONB array.
 */
export async function slugHeldElsewhere(slug: string, exceptId: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id FROM ctr_decks
     WHERE id <> ${exceptId}
       AND former_slugs @> ${JSON.stringify([slug])}::jsonb
     LIMIT 1
  `) as { id: string }[];

  return rows.length > 0;
}

async function insertDeck(d: Omit<Deck, "id">): Promise<Deck> {
  const sql = getSql();

  const rows = (await sql`
    INSERT INTO ctr_decks (name, slug, status, blurb, show_heading, pages, former_slugs, sort_order)
    VALUES (
      ${d.name}, ${d.slug}, ${d.status}, ${d.blurb}, ${d.show_heading},
      ${JSON.stringify(d.pages)}::jsonb, '[]'::jsonb, ${d.sort_order}
    )
    RETURNING id, name, slug, status, blurb, show_heading, pages, former_slugs, sort_order
  `) as Deck[];

  return hydrate(rows[0]);
}

/**
 * Null when the id does not exist — the route turns that into a 404.
 *
 * A changed slug pushes the old one into `former_slugs` rather than replacing
 * it, so every address this deck has ever had still finds it. The list is built
 * here rather than trusted from the request: a browser cannot be allowed to
 * claim an address the deck never had, which would be a way to take a slug out
 * from under another one.
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

  if (d.slug !== existing.slug && (await slugHeldElsewhere(d.slug, id))) {
    const conflict = new Error("That address still belongs to another deck.") as Error & {
      code?: string;
    };
    conflict.code = DUPLICATE;
    throw conflict;
  }

  const formerSlugs =
    existing.slug && existing.slug !== d.slug
      ? [...new Set([...existing.former_slugs, existing.slug])].filter((slug) => slug !== d.slug)
      : existing.former_slugs.filter((slug) => slug !== d.slug);

  if (d.slug !== existing.slug) {
    notes?.push(
      `The old address /deck/${existing.slug} still works — it now redirects here.`
    );
  }

  const rows = (await sql`
    UPDATE ctr_decks
       SET name         = ${d.name},
           slug         = ${d.slug},
           status       = ${d.status},
           blurb        = ${d.blurb},
           show_heading = ${d.show_heading},
           pages        = ${JSON.stringify(d.pages)}::jsonb,
           former_slugs = ${JSON.stringify(formerSlugs)}::jsonb,
           updated_at   = now()
     WHERE id = ${id}
    RETURNING id, name, slug, status, blurb, show_heading, pages, former_slugs, sort_order
  `) as Deck[];

  return rows[0] ? hydrate(rows[0]) : null;
}

/** Spaced by ten, one transaction — the same rule every other list follows. */
export async function reorderDecks(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const sql = getSql();

  await sql.transaction(
    ids.map(
      (id, index) => sql`
        UPDATE ctr_decks
           SET sort_order = ${(index + 1) * 10}, updated_at = now()
         WHERE id = ${id}
      `
    )
  );
}

/**
 * Removes a deck.
 *
 * The images are NOT deleted from the bucket, and that is deliberate. They sit
 * under the media prefix, where they are shared: the same upload can be a deck
 * page and the photograph on a section of a page, because the media library
 * offers every picture to every screen. Deleting the objects would take the
 * picture off a page that has nothing to do with this deck. Registration
 * attachments are the opposite case — private, single-use, under their own
 * prefix — which is why deleting a form does delete those.
 *
 * A page pointing at a deck that has gone shows nothing rather than a dead card;
 * see the decks section on /incrc.
 */
export async function deleteDeck(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM ctr_decks WHERE id = ${id} RETURNING id
  `) as { id: string }[];

  return rows.length > 0;
}
