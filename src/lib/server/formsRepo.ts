import "server-only";

import {
  FORM_STATUSES,
  fileOf,
  normaliseFormFields,
  normaliseFormInput,
  normaliseSections,
  type Form,
  type FormSummary,
} from "@/lib/forms";
import { oneOf } from "@/lib/normalise";
import { FORM_PAGE_KEYS, type FormPageKey } from "@/lib/roles";
import { getSql } from "@/lib/server/db";
import { deleteObjects } from "@/lib/server/s3";

/**
 * Every read and write of ctr_forms.
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
    // Both together: the questions are sorted into section order, so reading
    // one without the other would put them back out of it.
    sections: normaliseSections(row.sections, row.fields),
    fields: normaliseFormFields(row.fields, undefined, normaliseSections(row.sections, row.fields)),
  };
}

export async function listForms(): Promise<Form[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, slug, page_key, status, blurb, intro_title, intro_body,
           submit_label, success_title, success_body, closed_note, notify_to,
           opens_at, closes_at, max_entries,
           fields, sections, former_slugs, sort_order
      FROM ctr_forms
     ORDER BY sort_order ASC, name ASC
  `) as Form[];

  return rows.map(hydrate);
}

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
    SELECT f.id, f.name, f.slug, f.page_key, f.status, f.blurb, f.sort_order,
           f.opens_at, f.closes_at, f.max_entries,
           (SELECT count(*)::int FROM ctr_form_entries e WHERE e.form_id = f.id) AS entries
      FROM ctr_forms f
     WHERE f.page_key = ${page}
       AND f.status <> 'draft'
     ORDER BY f.sort_order ASC, f.name ASC
  `) as FormSummary[];

  return rows.map((row) => ({
    ...row,
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
    SELECT id, name, slug, page_key, status, blurb, intro_title, intro_body,
           submit_label, success_title, success_body, closed_note, notify_to,
           opens_at, closes_at, max_entries,
           fields, sections, former_slugs, sort_order
      FROM ctr_forms
     WHERE id = ${id}
  `) as Form[];

  return rows[0] ? hydrate(rows[0]) : null;
}

/** The current slug first, then the former ones — see the note at the top. */
export async function getFormBySlug(slug: string): Promise<Form | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, slug, page_key, status, blurb, intro_title, intro_body,
           submit_label, success_title, success_body, closed_note, notify_to,
           opens_at, closes_at, max_entries,
           fields, sections, former_slugs, sort_order
      FROM ctr_forms
     WHERE slug = ${slug}
        OR former_slugs @> ${JSON.stringify([slug])}::jsonb
     ORDER BY (slug = ${slug}) DESC
     LIMIT 1
  `) as Form[];

  return rows[0] ? hydrate(rows[0]) : null;
}

/** Postgres' unique violation, which on this table can only be the slug. */
const DUPLICATE = "23505";

/**
 * Adds a form, giving it an address nobody else has.
 *
 * Every new form starts life called "New form", which slugifies to `new-form`,
 * which is `UNIQUE` — so pressing "Add form" a second time was a guaranteed 409
 * reading "That link is already in use", about a link the admin had never typed
 * for a form they had not yet seen. Adding a suffix is what the admin would
 * have had to do by hand, so it is done for them and said out loud.
 */
export async function createForm(input: unknown, notes?: string[]): Promise<Form> {
  const first = normaliseFormInput(input, notes);

  for (let attempt = 1; attempt <= 20; attempt += 1) {
    const slug = attempt === 1 ? first.slug : `${first.slug}-${attempt}`;

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

/**
 * Whether another form still answers to this address.
 *
 * `former_slugs` is what makes a printed link or a QR code survive a rename, and
 * nothing checked it before handing the same address to a different form — so
 * form B could take an address form A's poster still resolves through, and the
 * old link would quietly start opening somebody else's entry form. There is no
 * unique index to lean on here: the column is a JSONB array.
 */
export async function slugHeldElsewhere(slug: string, exceptId: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id FROM ctr_forms
     WHERE id <> ${exceptId}
       AND former_slugs @> ${JSON.stringify([slug])}::jsonb
     LIMIT 1
  `) as { id: string }[];

  return rows.length > 0;
}

async function insertForm(f: Omit<Form, "id">): Promise<Form> {
  const sql = getSql();

  const rows = (await sql`
    INSERT INTO ctr_forms (
      name, slug, page_key, status, blurb, intro_title, intro_body,
      submit_label, success_title, success_body, closed_note, notify_to,
      opens_at, closes_at, max_entries,
      fields, sections, former_slugs, sort_order
    )
    VALUES (
      ${f.name}, ${f.slug}, ${f.page_key}, ${f.status}, ${f.blurb},
      ${f.intro_title}, ${f.intro_body}, ${f.submit_label}, ${f.success_title},
      ${f.success_body}, ${f.closed_note}, ${f.notify_to},
      ${f.opens_at || null}, ${f.closes_at || null}, ${f.max_entries},
      ${JSON.stringify(f.fields)}::jsonb, ${JSON.stringify(f.sections)}::jsonb,
      '[]'::jsonb, ${f.sort_order}
    )
    RETURNING id, name, slug, page_key, status, blurb, intro_title, intro_body,
              submit_label, success_title, success_body, closed_note, notify_to,
              opens_at, closes_at, max_entries,
              fields, sections, former_slugs, sort_order
  `) as Form[];

  return hydrate(rows[0]);
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
  if (f.slug !== existing.slug && (await slugHeldElsewhere(f.slug, id))) {
    const conflict = new Error("That address still belongs to another form.") as Error & {
      code?: string;
    };
    conflict.code = DUPLICATE;
    throw conflict;
  }

  const formerSlugs =
    existing.slug && existing.slug !== f.slug
      ? [...new Set([...existing.former_slugs, existing.slug])].filter((slug) => slug !== f.slug)
      : existing.former_slugs.filter((slug) => slug !== f.slug);

  const rows = (await sql`
    UPDATE ctr_forms
       SET name          = ${f.name},
           slug          = ${f.slug},
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
           former_slugs  = ${JSON.stringify(formerSlugs)}::jsonb,
           updated_at    = now()
     WHERE id = ${id}
    RETURNING id, name, slug, page_key, status, blurb, intro_title, intro_body,
              submit_label, success_title, success_body, closed_note, notify_to,
              opens_at, closes_at, max_entries,
              fields, sections, former_slugs, sort_order
  `) as Form[];

  return rows[0] ? hydrate(rows[0]) : null;
}

/** Spaced by ten, one transaction — the same rule the circuits list follows. */
export async function reorderForms(ids: string[]): Promise<void> {
  if (ids.length === 0) return;

  const sql = getSql();

  await sql.transaction(
    ids.map(
      (id, index) => sql`
        UPDATE ctr_forms
           SET sort_order = ${(index + 1) * 10}, updated_at = now()
         WHERE id = ${id}
      `
    )
  );
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
    SELECT answers FROM ctr_form_entries WHERE form_id = ${id}
  `) as { answers: Record<string, unknown> }[];

  const files = keys
    .flatMap((row) => Object.values(row.answers ?? {}))
    .map((value) => fileOf(value)?.key)
    .filter((key): key is string => Boolean(key));

  const rows = (await sql`
    DELETE FROM ctr_forms WHERE id = ${id} RETURNING id
  `) as { id: string }[];

  if (rows.length === 0) return false;

  // After the row is gone: an object without a row is rubbish, whereas a row
  // without its object is an entry that has silently lost its attachment.
  await deleteObjects(files).catch((error) => {
    console.error("[forms] could not remove the attachments for", id, error);
  });

  return true;
}
