import "server-only";

import { cache } from "react";
import {
  FORM_STATUSES,
  normaliseFormFields,
  normaliseFormInput,
  normaliseSections,
  type Form,
  type FormSummary,
} from "@/lib/forms";
import { oneOf } from "@/lib/normalise";
import { FORM_PAGE_KEYS, type FormPageKey } from "@/lib/roles";
import { type SlugHolder } from "@/lib/slug";
import { getSql } from "@/lib/server/db";
import { deleteObjects } from "@/lib/server/s3";
import {
  findSlugOwner as findOwner,
  releaseFormerSlug as releaseFormer,
  resolveSlug,
  writeSlugs,
} from "@/lib/server/slugsRepo";

/**
 * Every read and write of ctr.forms.
 *
 * The column list is spelled out in each query rather than shared through a
 * helper, the same way tracksRepo does it: a handful of queries repeating the
 * names is easier to follow than one builder that hides them.
 *
 * Two things here are not in the other repos:
 *
 * `getFormBySlug` matches the CURRENT slug or any former one, which is what
 * makes a printed address keep working after a rename. The page turns a former
 * match into a permanent redirect, so the old link corrects itself in the bar.
 *
 * A duplicate slug is left to the unique index and comes back as Postgres
 * 23505. The route turns that into a sentence; catching it here would mean
 * either swallowing it or inventing a return value for "no".
 *
 * Every read of the questions goes through `hydrate`. See its note — it is not
 * decoration, and leaving it off any one query would be a crash.
 */

/**
 * The questions, put through the normaliser on the way OUT as well as in.
 *
 * `fields` is a JSONB document, so a row written by an older version of this
 * code is a shape the current code has never seen: a question saved before
 * questions could depend on each other has no rule on it at all, and anything
 * reading `field.when.key` finds nothing to read it from.
 *
 * Normalising on write is not enough for that, because the rows that need it
 * are precisely the ones that are not being written. This is the same
 * read-and-write pair every content document here uses, and the reason is the
 * same: a new setting has to arrive with a value for every row that already
 * exists, without a migration and without a write.
 */
function asIso(value: unknown): string {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? "" : value.toISOString();
  return typeof value === "string" ? value : "";
}

function hydrate(row: Form): Form {
  const sections = normaliseSections(row.sections, row.fields);

  return {
    ...row,
    // `status` and `page_key` are plain text columns with no CHECK constraint —
    // this project's stated way of retiring a value is `oneOf` on read, not a
    // migration. Without it, a row holding anything unexpected made
    // `STATUS_LABELS[row.status]` undefined, and the picker threw calling
    // `.toLowerCase()` on it. The doc above promised this protection and
    // delivered it for one column out of sixteen.
    status: oneOf(row.status, FORM_STATUSES, "draft"),
    // `timestamptz` arrives as a Date. The type says string, and this is the
    // boundary that has to make that true — the same lesson the CSV export
    // taught the hard way.
    opens_at: asIso(row.opens_at),
    closes_at: asIso(row.closes_at),
    max_entries: Number(row.max_entries) || 0,
    page_key: oneOf(row.page_key, FORM_PAGE_KEYS, "" as FormPageKey | ""),
    slug: row.slug ?? "",
    former_slugs: row.former_slugs ?? [],
    // Both together: the questions are sorted into section order, so reading one
    // without the other would put them back out of it.
    //
    // Computed ONCE. It used to be called twice per row with identical
    // arguments — once for `sections` and again inside the `fields` call — and
    // it is O(sections x fields), so every read of every form did that work
    // twice for nothing.
    sections,
    fields: normaliseFormFields(row.fields, undefined, sections),
  };
}

/**
 * Every form, or only the ones on the given pages.
 *
 * The filter is a `WHERE` rather than a `.filter()` on the way out. The admin
 * route fetched every form and dropped the ones the signed-in account could not
 * see, in JavaScript, on both the list and the count — so a `pages` admin scoped
 * to one page still paid for every form in the database, and the rows they were
 * not allowed to see travelled to the server that was about to discard them.
 *
 * No argument means no filter, which is what an owner gets.
 */
export const listForms = cache(async (pages?: readonly string[]): Promise<Form[]> => {
  const sql = getSql();
  const wanted = pages ? [...pages] : null;

  const rows = (await sql`
    SELECT id, name, page_key, status, blurb, intro_title, intro_body,
           submit_label, success_title, success_body, closed_note, notify_to,
           opens_at, closes_at, max_entries,
           fields, sections, sort_order,
           (SELECT s.slug FROM ctr.slugs s
             WHERE s.entity_type = 'form' AND s.entity_id = f.id AND s.is_current) AS slug,
           (SELECT coalesce(jsonb_agg(s.slug ORDER BY s.created_at), '[]'::jsonb) FROM ctr.slugs s
             WHERE s.entity_type = 'form' AND s.entity_id = f.id AND NOT s.is_current) AS former_slugs
      FROM ctr.forms f
     WHERE ${wanted}::text[] IS NULL OR f.page_key = ANY(${wanted}::text[])
     ORDER BY f.sort_order ASC, f.name ASC
  `) as Form[];

  return rows.map(hydrate);
});

/**
 * The forms on one page, for the site and for the picker.
 *
 * Drafts are left out everywhere this is used: the page cards and the picker
 * both point at something a visitor will click, and a draft is not on the
 * internet at all.
 */
export async function listFormsForPage(page: FormPageKey): Promise<FormSummary[]> {
  const sql = getSql();

  // The count comes back with the row rather than one query per card: a card
  // cannot say "full" without knowing it, and a page with six forms should not
  // be seven round trips.
  const rows = (await sql`
    SELECT f.id, f.name, f.page_key, f.status, f.blurb, f.sort_order,
           f.opens_at, f.closes_at, f.max_entries,
           (SELECT s.slug FROM ctr.slugs s
             WHERE s.entity_type = 'form' AND s.entity_id = f.id AND s.is_current) AS slug,
           (SELECT count(*)::int FROM ctr.form_entries e WHERE e.form_id = f.id) AS entries
      FROM ctr.forms f
     WHERE f.page_key = ${page}
       AND f.status <> 'draft'
     ORDER BY f.sort_order ASC, f.name ASC
  `) as FormSummary[];

  return rows.map((row) => ({
    ...row,
    slug: row.slug ?? "",
    opens_at: asIso(row.opens_at),
    closes_at: asIso(row.closes_at),
    max_entries: Number(row.max_entries) || 0,
    entries: Number(row.entries) || 0,
  }));
}

/**
 * Same, but an unreachable database yields an empty list instead of throwing.
 *
 * What the public page uses: a section with no cards is a section that renders
 * nothing, which is a far better failure than a page that will not draw.
 */
export async function listFormsForPageSafe(page: FormPageKey): Promise<FormSummary[]> {
  try {
    return await listFormsForPage(page);
  } catch (error) {
    console.error("[forms] could not load the forms for", page, error);
    return [];
  }
}

export async function getForm(id: string): Promise<Form | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, page_key, status, blurb, intro_title, intro_body,
           submit_label, success_title, success_body, closed_note, notify_to,
           opens_at, closes_at, max_entries,
           fields, sections, sort_order,
           (SELECT s.slug FROM ctr.slugs s
             WHERE s.entity_type = 'form' AND s.entity_id = f.id AND s.is_current) AS slug,
           (SELECT coalesce(jsonb_agg(s.slug ORDER BY s.created_at), '[]'::jsonb) FROM ctr.slugs s
             WHERE s.entity_type = 'form' AND s.entity_id = f.id AND NOT s.is_current) AS former_slugs
      FROM ctr.forms f
     WHERE f.id = ${id}
  `) as Form[];

  return rows[0] ? hydrate(rows[0]) : null;
}

/**
 * The form at an address, current or former.
 *
 * One indexed lookup in `slugs` and then the row, instead of the old
 * `slug = $1 OR former_slugs @> $2::jsonb` over an unindexed JSONB column. The
 * page turns a former match into a permanent redirect, so a printed link or a
 * QR code corrects itself in the address bar.
 */
export async function getFormBySlug(slug: string): Promise<Form | null> {
  const found = await resolveSlug("form", slug);
  return found ? getForm(found.id) : null;
}

/** Postgres' unique violation, which on this table can only be the slug. */
const DUPLICATE = "23505";

/** Stands in for "no form to exclude" — `id <> ''` is a type error, not a match. */
const NO_FORM = "00000000-0000-0000-0000-000000000000";

/** A refusal the routes already know how to turn into a 409. */
function taken(message: string): Error & { code?: string } {
  const conflict = new Error(message) as Error & { code?: string };
  conflict.code = DUPLICATE;
  return conflict;
}

/**
 * Adds a form at the address it was asked for.
 *
 * Two paths, and which one runs depends on whether the caller typed an address:
 *
 * An address that was TYPED is honoured exactly or refused. It used to be
 * quietly suffixed, which was the right answer back when the address was
 * invented by the screen rather than chosen by a person — but somebody who
 * typed `2026-entry` and got `2026-entry-2` has been handed a link they did not
 * ask for and will not think to check. The editor asks before it posts now, so
 * a collision here is worth a sentence.
 *
 * An address that was NOT typed still gets the suffix loop, because something
 * has to be invented and the alternative is refusing to create the row at all.
 * That path is for the check scripts and anything else posting a bare name.
 */
export async function createForm(input: unknown, notes?: string[]): Promise<Form> {
  const first = normaliseFormInput(input, notes);
  const asked = typeof (input as { slug?: unknown })?.slug === "string"
    && (input as { slug: string }).slug.trim() !== "";

  if (asked) {
    // The unique index cannot see this one: a former address lives in a JSONB
    // array. Without the check a new form can take an address another form's
    // poster still resolves through, and that poster silently changes meaning.
    const holder = await findSlugOwner(first.slug);
    if (holder) throw taken(heldBy(first.slug, holder));

    return insertForm(first);
  }

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const slug = attempt === 1 ? first.slug : `${first.slug}-${attempt}`;

    // Skipped rather than attempted: the insert would succeed, because a former
    // address is not the unique column, and the collision would only show up as
    // somebody else's old link opening this form.
    if (await findSlugOwner(slug)) continue;

    try {
      const form = await insertForm({ ...first, slug });
      if (attempt > 1) notes?.push(`The address “${first.slug}” was taken, so this one is “${slug}”.`);
      return form;
    } catch (error) {
      // Anything that is not "that address exists" is the caller's to handle.
      if ((error as { code?: string })?.code !== DUPLICATE) throw error;
    }
  }

  throw new Error("Could not find a free address for the form.");
}

/** The sentence a held address gets refused with, in both directions. */
function heldBy(slug: string, holder: SlugHolder): string {
  const name = holder.name || "another form";
  return holder.held === "current"
    ? `/register/${slug} is where “${name}” lives. Give that form a different address first.`
    : `/register/${slug} is an old address of “${name}” and still redirects there.`;
}

/**
 * Which form, if any, answers to this address — as its own or from its history.
 *
 * `former_slugs` is what makes a printed link or a QR code survive a rename, and
 * nothing checked it before handing the same address to a different form, so
 * form B could take an address form A's poster still resolves through. There is
 * no unique index to lean on for that half: the column is a JSONB array.
 *
 * The current address wins the tie, because that is the answer that decides
 * whether the address can be handed over at all — see `SlugHolder`.
 */
export async function findSlugOwner(slug: string, exceptId = ""): Promise<SlugHolder | null> {
  return findOwner("form", slug, exceptId);
}

/**
 * Drops one address out of a form's history, so another form may take it.
 *
 * Only ever a FORMER address. A form's current slug is not removable here at
 * all — see the guard in slugsRepo — because a form with no address is not a
 * form, and "reassign" would mean deleting somebody's live page as a side
 * effect of typing in a box on a different screen.
 */
export async function releaseFormerSlug(slug: string, fromId: string): Promise<boolean> {
  return releaseFormer("form", slug, fromId);
}

async function insertForm(f: Omit<Form, "id">): Promise<Form> {
  const sql = getSql();

  const rows = (await sql`
    INSERT INTO ctr.forms (
      name, page_key, status, blurb, intro_title, intro_body,
      submit_label, success_title, success_body, closed_note, notify_to,
      opens_at, closes_at, max_entries, fields, sections, sort_order
    )
    VALUES (
      ${f.name}, ${f.page_key}, ${f.status}, ${f.blurb},
      ${f.intro_title}, ${f.intro_body}, ${f.submit_label}, ${f.success_title},
      ${f.success_body}, ${f.closed_note}, ${f.notify_to},
      ${f.opens_at || null}, ${f.closes_at || null}, ${f.max_entries},
      ${JSON.stringify(f.fields)}::jsonb, ${JSON.stringify(f.sections)}::jsonb,
      ${f.sort_order}
    )
    RETURNING id
  `) as { id: string }[];

  await writeSlugs("form", rows[0].id, f.slug, []);

  const created = await getForm(rows[0].id);
  if (!created) throw new Error("The form was not written.");
  return created;
}

/**
 * Null when the id does not exist — the route turns that into a 404.
 *
 * A changed slug pushes the old one into `former_slugs` rather than replacing
 * it, so every address this form has ever had still finds it. The list is
 * built here rather than trusted from the request: a browser cannot be allowed
 * to claim an address the form never had, which would be a way to take a slug
 * out from under another form.
 *
 * It can only ever SHRINK from the request, which is the other half of that
 * rule and is safe for the same reason it is unsafe in reverse. Retiring an old
 * address is a real thing to want — a link that was wrong, or one being freed
 * for a different form — and there was no way to do it: the history only grew,
 * so a slug typed once was answered for by that form forever.
 *
 * Deliberately does NOT write sort_order, for the same reason updateTrack does
 * not: position belongs to `reorderForms`, so a form opened before someone
 * dragged the list cannot save a stale position back over it.
 */
export async function updateForm(
  id: string,
  input: unknown,
  notes?: string[]
): Promise<Form | null> {
  const sql = getSql();
  const f = normaliseFormInput(input, notes);

  const existing = await getForm(id);
  if (!existing) return null;

  // Taking an address another form still answers to would silently redirect
  // that form's printed links here. The route turns this into a 409.
  if (f.slug !== existing.slug) {
    const holder = await findSlugOwner(f.slug, id);
    if (holder) throw taken(heldBy(f.slug, holder));
  }

  /*
   * The history is the STORED list narrowed by what the editor kept — never the
   * list the request sent.
   *
   * Read from the raw body rather than the normalised form, because those are
   * different questions: the normaliser turns a missing field into `[]`, and
   * treating that as "the editor cleared it" would wipe the redirects of every
   * caller that posts a form without one.
   */
  const requested = (input as { former_slugs?: unknown })?.former_slugs;
  const kept = Array.isArray(requested)
    ? existing.former_slugs.filter((slug) => requested.includes(slug))
    : existing.former_slugs;

  const retired = existing.former_slugs.length - kept.length;
  if (retired > 0) {
    notes?.push(
      retired === 1
        ? "One old address was retired — it no longer finds this form."
        : `${retired} old addresses were retired — they no longer find this form.`
    );
  }

  const formerSlugs =
    existing.slug && existing.slug !== f.slug
      ? [...new Set([...kept, existing.slug])].filter((slug) => slug !== f.slug)
      : kept.filter((slug) => slug !== f.slug);

  const rows = (await sql`
    UPDATE ctr.forms
       SET name          = ${f.name},
           page_key      = ${f.page_key},
           status        = ${f.status},
           blurb         = ${f.blurb},
           intro_title   = ${f.intro_title},
           intro_body    = ${f.intro_body},
           submit_label  = ${f.submit_label},
           success_title = ${f.success_title},
           success_body  = ${f.success_body},
           closed_note   = ${f.closed_note},
           notify_to     = ${f.notify_to},
           opens_at      = ${f.opens_at || null},
           closes_at     = ${f.closes_at || null},
           max_entries   = ${f.max_entries},
           fields        = ${JSON.stringify(f.fields)}::jsonb,
           sections      = ${JSON.stringify(f.sections)}::jsonb,
           updated_at    = now()
     WHERE id = ${id}
    RETURNING id
  `) as { id: string }[];

  if (rows.length === 0) return null;

  await writeSlugs("form", id, f.slug, formerSlugs);

  return getForm(id);
}

/**
 * Spaced by ten, in one statement.
 *
 * `unnest` over two arrays rather than a statement per form: reordering a list
 * of twenty was twenty round trips inside a transaction, and every position is
 * already known before any of them is sent.
 */
export async function reorderForms(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const sql = getSql();
  const orders = ids.map((_, index) => (index + 1) * 10);

  await sql`
    UPDATE ctr.forms f
       SET sort_order = wanted.position, updated_at = now()
      FROM unnest(${ids}::uuid[], ${orders}::int[]) AS wanted(id, position)
     WHERE f.id = wanted.id
  `;
}

/**
 * The entries go with it — the foreign key is ON DELETE CASCADE.
 *
 * That is the whole reason the confirmation on the screen counts them: deleting
 * a form is deleting everyone who entered it, and there is no undo.
 */
export async function deleteForm(id: string): Promise<boolean> {
  const sql = getSql();

  /*
   * The attachments go too.
   *
   * Deleting a form cascades its entries in Postgres, and the rows being
   * deleted are the only record of which objects in the bucket belonged to
   * them. Without this, deleting a form would leave the licence scans and
   * photographs of everyone who ever entered it sitting in storage with nothing
   * left pointing at them — undeletable in practice, because nobody would know
   * which they were.
   *
   * Collected BEFORE the delete, for that reason. It is not in a transaction
   * with it — the bucket and the database cannot be — so the order matters: a
   * failure here leaves the form intact and nothing lost.
   */
  const keys = (await sql`
    SELECT k.s3_key
      FROM ctr.form_entry_files k
      JOIN ctr.form_entries e ON e.id = k.entry_id
     WHERE e.form_id = ${id}
  `) as { s3_key: string }[];

  const files = keys.map((row) => row.s3_key).filter(Boolean);

  const rows = (await sql`
    DELETE FROM ctr.forms WHERE id = ${id} RETURNING id
  `) as { id: string }[];

  if (rows.length === 0) return false;

  // After the row is gone: an object without a row is rubbish, whereas a row
  // without its object is an entry that has silently lost its attachment.
  await deleteObjects(files).catch((error) => {
    console.error("[forms] could not remove the attachments for", id, error);
  });

  return true;
}
