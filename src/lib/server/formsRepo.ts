import "server-only";

import { normaliseFormFields, normaliseFormInput, type Form, type FormSummary } from "@/lib/forms";
import type { FormPageKey } from "@/lib/roles";
import { getSql } from "@/lib/server/db";

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
function hydrate(row: Form): Form {
  return { ...row, fields: normaliseFormFields(row.fields) };
}

export async function listForms(): Promise<Form[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, name, slug, page_key, status, blurb, intro_title, intro_body,
           submit_label, success_title, success_body, closed_note, notify_to,
           fields, former_slugs, sort_order
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
  const rows = (await sql`
    SELECT id, name, slug, page_key, status, blurb, sort_order
      FROM ctr_forms
     WHERE page_key = ${page}
       AND status <> 'draft'
     ORDER BY sort_order ASC, name ASC
  `) as FormSummary[];

  return rows;
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
           fields, former_slugs, sort_order
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
           fields, former_slugs, sort_order
      FROM ctr_forms
     WHERE slug = ${slug}
        OR former_slugs @> ${JSON.stringify([slug])}::jsonb
     ORDER BY (slug = ${slug}) DESC
     LIMIT 1
  `) as Form[];

  return rows[0] ? hydrate(rows[0]) : null;
}

export async function createForm(input: unknown): Promise<Form> {
  const sql = getSql();
  const f = normaliseFormInput(input);

  const rows = (await sql`
    INSERT INTO ctr_forms (
      name, slug, page_key, status, blurb, intro_title, intro_body,
      submit_label, success_title, success_body, closed_note, notify_to,
      fields, former_slugs, sort_order
    )
    VALUES (
      ${f.name}, ${f.slug}, ${f.page_key}, ${f.status}, ${f.blurb},
      ${f.intro_title}, ${f.intro_body}, ${f.submit_label}, ${f.success_title},
      ${f.success_body}, ${f.closed_note}, ${f.notify_to},
      ${JSON.stringify(f.fields)}::jsonb, '[]'::jsonb, ${f.sort_order}
    )
    RETURNING id, name, slug, page_key, status, blurb, intro_title, intro_body,
              submit_label, success_title, success_body, closed_note, notify_to,
              fields, former_slugs, sort_order
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
export async function updateForm(id: string, input: unknown): Promise<Form | null> {
  const sql = getSql();
  const f = normaliseFormInput(input);

  const existing = await getForm(id);
  if (!existing) return null;

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
           fields        = ${JSON.stringify(f.fields)}::jsonb,
           former_slugs  = ${JSON.stringify(formerSlugs)}::jsonb,
           updated_at    = now()
     WHERE id = ${id}
    RETURNING id, name, slug, page_key, status, blurb, intro_title, intro_body,
              submit_label, success_title, success_body, closed_note, notify_to,
              fields, former_slugs, sort_order
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
  const rows = (await sql`
    DELETE FROM ctr_forms WHERE id = ${id} RETURNING id
  `) as { id: string }[];

  return rows.length > 0;
}
