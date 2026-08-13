import "server-only";

import { CREATED_COLUMN, type EntryCursor, type FormEntry, type Submission } from "@/lib/forms";
import { getSql } from "@/lib/server/db";

/**
 * Every read and write of ctr_form_entries.
 *
 * This is the one table in the project written by a stranger, so the values
 * reaching it have already been through `validateSubmission` — which is what
 * decides they are the questions the form actually asks, clamped to what an
 * answer may be. Nothing here re-checks that; what it does do is clamp the two
 * fields the SERVER supplies, because a user agent is also a header somebody
 * chose.
 *
 * Reading is keyset paged rather than OFFSET: entries only ever arrive at the
 * end, and an OFFSET page shifts under the reader while they are looking at it.
 * SORTED reading is the exception and uses OFFSET, because a cursor over an
 * answer nobody guarantees is unique is a cursor that skips rows — see
 * `listEntries`.
 *
 * ── Every read goes through `hydrate` ─────────────────────────────────────
 *
 * `FormEntry.created_at` is typed `string`, and the driver does not return one.
 * `@neondatabase/serverless` registers a parser for `timestamptz` and hands back
 * a JS `Date`, so the type was a lie on every row ever read — which is not a
 * theoretical complaint: `cell()` in the CSV writer calls `.replace()` on it,
 * `Date` has no such method, the handler swallowed the TypeError, and "Download
 * CSV" saved a file containing `{"error":"Could not load the entries."}` for
 * every form that had so much as one entry. The same `Date` reached the browser
 * as a paging cursor and came back as "Wed Aug 13 2026 15:04:05 GMT+0530", which
 * Postgres cannot parse, so the first "Load more" was a 500.
 *
 * Converting here rather than at the two places that broke: the type says
 * `string` and this is the only boundary that can make that true.
 */

/** A header is somebody's to write. Neither of these is ever trusted for length. */
const IP_MAX = 60;
const AGENT_MAX = 300;

/** How many entries one bulk delete may name. A page of the table, ten times over. */
export const MAX_BULK_DELETE = 500;

export type EntrySort = { key: string; dir: "asc" | "desc" };

/** The row as the rest of the project is entitled to assume it looks. */
function hydrate(row: FormEntry): FormEntry {
  const at = row.created_at as unknown;

  return {
    ...row,
    created_at: at instanceof Date ? at.toISOString() : String(at ?? ""),
  };
}

/**
 * The sort key that means the timestamp rather than an answer.
 *
 * Reserved in `normaliseFormFields`, which refuses to hand this id to a
 * question — so a form can never carry an answer key that this shadows.
 * Ordering by it descending is the same order the default view uses; ascending
 * is the one thing the cursor path cannot do, which is why it is here.
 */
export const CREATED_KEY = CREATED_COLUMN;

export async function createEntry(
  formId: string,
  answers: Submission,
  ip: string,
  userAgent: string
): Promise<FormEntry> {
  const sql = getSql();

  const rows = (await sql`
    INSERT INTO ctr_form_entries (form_id, answers, ip, user_agent)
    VALUES (
      ${formId},
      ${JSON.stringify(answers)}::jsonb,
      ${ip.slice(0, IP_MAX)},
      ${userAgent.slice(0, AGENT_MAX)}
    )
    RETURNING id, form_id, answers, ip, user_agent, created_at
  `) as FormEntry[];

  // An INSERT … RETURNING that comes back empty is not a row we can pretend to
  // have: returning `undefined` here made the caller's notification throw AFTER
  // the entry was already committed.
  if (!rows[0]) throw new Error("The entry was not written.");

  return hydrate(rows[0]);
}

/**
 * The same, but only while there is a place left. Null when there is not.
 *
 * The counting and the writing are ONE statement, which is the whole point.
 * Reading the count and then inserting is two, and two simultaneous entries
 * against a cap of one both read "nought so far" and both insert — the sixtieth
 * place goes to two people, and nothing anywhere says so. Here the count is a
 * sub-query of the insert itself, so the database serialises them: the second
 * one sees the first and writes nothing.
 *
 * `INSERT … SELECT … WHERE` rather than `VALUES`, because a `VALUES` clause has
 * nowhere to hang a condition.
 */
export async function createEntryWithinCap(
  formId: string,
  answers: Submission,
  ip: string,
  userAgent: string,
  cap: number
): Promise<FormEntry | null> {
  if (cap <= 0) return createEntry(formId, answers, ip, userAgent);

  const sql = getSql();

  const rows = (await sql`
    INSERT INTO ctr_form_entries (form_id, answers, ip, user_agent)
    SELECT ${formId}, ${JSON.stringify(answers)}::jsonb,
           ${ip.slice(0, IP_MAX)}, ${userAgent.slice(0, AGENT_MAX)}
     WHERE (SELECT count(*) FROM ctr_form_entries WHERE form_id = ${formId}) < ${cap}
    RETURNING id, form_id, answers, ip, user_agent, created_at
  `) as FormEntry[];

  return rows[0] ? hydrate(rows[0]) : null;
}

/**
 * One page of entries.
 *
 * Two ways of paging, because there are two ways of ordering and a cursor only
 * works for one of them:
 *
 *   newest first   `before` is the (created_at, id) of the last row already
 *                  shown. Both halves, compared as a row — two entries can land
 *                  in the same millisecond, and a cursor on the timestamp alone
 *                  either repeats one or skips one. Nothing is ever inserted
 *                  ABOVE what is on screen, so this page cannot shift.
 *   by an answer   OFFSET. A cursor needs the thing it points at to be unique,
 *                  and "Priya" is not: a keyset on an answer would step over
 *                  every other row that shares it. The cost is the usual one —
 *                  an entry arriving mid-read can nudge a row across a page
 *                  boundary — which is worth far less than the rows a broken
 *                  cursor would silently drop.
 *
 * Sorting by an answer is sorting a JSONB value, so it is text. That is wrong
 * for the one column where it shows most — an age, where text order puts 10
 * before 9 — hence the numeric term first: rows whose answer IS a number sort
 * numerically, and anything else falls through to the words. A missing answer
 * and a blank one are the same thing here, and both go last whichever way round
 * it is sorted.
 */
export async function listEntries(
  formId: string,
  {
    limit = 50,
    before,
    sort,
    offset = 0,
  }: { limit?: number; before?: EntryCursor; sort?: EntrySort; offset?: number } = {}
): Promise<FormEntry[]> {
  const sql = getSql();
  const take = Math.min(Math.max(limit, 1), 500);
  const skip = Math.max(offset, 0);

  if (sort?.key === CREATED_KEY) {
    const rows =
      sort.dir === "asc"
        ? ((await sql`
            SELECT id, form_id, answers, ip, user_agent, created_at
              FROM ctr_form_entries
             WHERE form_id = ${formId}
             ORDER BY created_at ASC, id ASC
             LIMIT ${take} OFFSET ${skip}
          `) as FormEntry[])
        : ((await sql`
            SELECT id, form_id, answers, ip, user_agent, created_at
              FROM ctr_form_entries
             WHERE form_id = ${formId}
             ORDER BY created_at DESC, id DESC
             LIMIT ${take} OFFSET ${skip}
          `) as FormEntry[]);

    return rows.map(hydrate);
  }

  if (sort) {
    const key = sort.key;

    // Two whole queries rather than one with the direction interpolated: a sort
    // direction cannot be a bind parameter, and building SQL by concatenation
    // is the habit this file does not want to start.
    const rows =
      sort.dir === "asc"
        ? ((await sql`
            SELECT id, form_id, answers, ip, user_agent, created_at
              FROM ctr_form_entries
             WHERE form_id = ${formId}
             ORDER BY (CASE WHEN NULLIF(answers->>${key}, '') ~ '^-?[0-9]+([.][0-9]+)?$'
                            THEN (answers->>${key})::numeric END) ASC NULLS LAST,
                      lower(NULLIF(answers->>${key}, '')) ASC NULLS LAST,
                      created_at DESC, id DESC
             LIMIT ${take} OFFSET ${skip}
          `) as FormEntry[])
        : ((await sql`
            SELECT id, form_id, answers, ip, user_agent, created_at
              FROM ctr_form_entries
             WHERE form_id = ${formId}
             ORDER BY (CASE WHEN NULLIF(answers->>${key}, '') ~ '^-?[0-9]+([.][0-9]+)?$'
                            THEN (answers->>${key})::numeric END) DESC NULLS LAST,
                      lower(NULLIF(answers->>${key}, '')) DESC NULLS LAST,
                      created_at DESC, id DESC
             LIMIT ${take} OFFSET ${skip}
          `) as FormEntry[]);

    return rows.map(hydrate);
  }

  const rows = before
    ? ((await sql`
        SELECT id, form_id, answers, ip, user_agent, created_at
          FROM ctr_form_entries
         WHERE form_id = ${formId}
           -- Both halves, compared as a row: this is the tie-break the note
           -- above promises, and without it rows sharing a timestamp with the
           -- last one on screen were skipped for good.
           AND (created_at, id) < (${before.at}::timestamptz, ${before.id}::uuid)
         ORDER BY created_at DESC, id DESC
         LIMIT ${take}
      `) as FormEntry[])
    : ((await sql`
        SELECT id, form_id, answers, ip, user_agent, created_at
          FROM ctr_form_entries
         WHERE form_id = ${formId}
         ORDER BY created_at DESC, id DESC
         LIMIT ${take}
      `) as FormEntry[]);

  return rows.map(hydrate);
}

/** One entry, scoped by form. Read before an edit, to keep what it already holds. */
export async function getEntry(formId: string, entryId: string): Promise<FormEntry | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, form_id, answers, ip, user_agent, created_at
      FROM ctr_form_entries
     WHERE id = ${entryId} AND form_id = ${formId}
  `) as FormEntry[];

  return rows[0] ? hydrate(rows[0]) : null;
}

/**
 * Corrects one entry's answers.
 *
 * `created_at` is deliberately left alone: it is when the entry was made, and an
 * edit is not a new entry. The table's default order therefore does not move
 * under somebody who is halfway through tidying it up.
 */
export async function updateEntry(
  formId: string,
  entryId: string,
  answers: Submission
): Promise<FormEntry | null> {
  const sql = getSql();

  const rows = (await sql`
    UPDATE ctr_form_entries
       SET answers = ${JSON.stringify(answers)}::jsonb
     WHERE id = ${entryId} AND form_id = ${formId}
    RETURNING id, form_id, answers, ip, user_agent, created_at
  `) as FormEntry[];

  return rows[0] ? hydrate(rows[0]) : null;
}

/**
 * The same, but an unreachable database counts as nought rather than throwing.
 *
 * For the public page, which asks only to say how many places are left. A count
 * it cannot get is not a reason to refuse to draw the form — and the cap is
 * enforced by the insert regardless, so nothing depends on this being right.
 */
export async function countEntriesSafe(formId: string): Promise<number> {
  try {
    return await countEntries(formId);
  } catch (error) {
    console.error("[forms] could not count the entries for", formId, error);
    return 0;
  }
}

export async function countEntries(formId: string): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT count(*)::int AS count FROM ctr_form_entries WHERE form_id = ${formId}
  `) as { count: number }[];

  return rows[0]?.count ?? 0;
}

/**
 * How many this address has sent lately.
 *
 * The durable half of the rate limit. The in-process counter in rateLimit.ts is
 * one budget per running instance and is gone on a restart; this is a count of
 * what actually landed, so it holds however many instances there are and
 * whatever the process did overnight.
 */
export async function countRecentEntries(
  formId: string,
  ip: string,
  hours: number
): Promise<number> {
  if (!ip) return 0;

  const sql = getSql();
  const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

  const rows = (await sql`
    SELECT count(*)::int AS count
      FROM ctr_form_entries
     WHERE form_id = ${formId}
       AND ip = ${ip.slice(0, IP_MAX)}
       AND created_at > ${since}
  `) as { count: number }[];

  return rows[0]?.count ?? 0;
}

/** Scoped by form as well as id, so a stray id cannot delete another form's entry. */
export async function deleteEntry(formId: string, entryId: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM ctr_form_entries
     WHERE id = ${entryId} AND form_id = ${formId}
    RETURNING id
  `) as { id: string }[];

  return rows.length > 0;
}

/**
 * Several at once, in one transaction — all of them or none.
 *
 * A statement per id, the way `reorderForms` does it, rather than one `= ANY`:
 * the ids arrive one to a row from a set of ticked boxes, and this driver takes
 * a list of statements far more comfortably than an array bind.
 *
 * Every one is scoped by form, so a list of ids gathered from one screen cannot
 * reach into another form's entries. Returns how many actually went, which is
 * not always how many were named — somebody else may have deleted one already.
 */
export async function deleteEntries(formId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const sql = getSql();

  const results = await sql.transaction(
    ids.slice(0, MAX_BULK_DELETE).map(
      (entryId) => sql`
        DELETE FROM ctr_form_entries
         WHERE id = ${entryId} AND form_id = ${formId}
        RETURNING id
      `
    )
  );

  return results.reduce((gone, rows) => gone + (rows as { id: string }[]).length, 0);
}
