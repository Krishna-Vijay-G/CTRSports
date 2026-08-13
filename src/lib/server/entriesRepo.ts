import "server-only";

import type { FormEntry, Submission } from "@/lib/forms";
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
 */

/** A header is somebody's to write. Neither of these is ever trusted for length. */
const IP_MAX = 60;
const AGENT_MAX = 300;

/** How many entries one bulk delete may name. A page of the table, ten times over. */
export const MAX_BULK_DELETE = 500;

export type EntrySort = { key: string; dir: "asc" | "desc" };

/**
 * The sort key that means the timestamp rather than an answer.
 *
 * It is not a field id and can never be one — a form's ids come out of
 * `normaliseFormFields`, which builds them as `f<n>` or takes what the builder
 * generated, and neither produces this word on its own by accident. Ordering by
 * it descending is the same order the default view uses; ascending is the one
 * thing the cursor path cannot do, which is why it is here.
 */
export const CREATED_KEY = "created";

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

  return rows[0];
}

/**
 * One page of entries.
 *
 * Two ways of paging, because there are two ways of ordering and a cursor only
 * works for one of them:
 *
 *   newest first   `before` is the created_at of the last row already shown, and
 *                  the id is the tie-break — two entries can land in the same
 *                  millisecond, and a cursor on the timestamp alone would either
 *                  repeat one or skip one. Nothing is ever inserted ABOVE what
 *                  is on screen, so this page cannot shift.
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
  }: { limit?: number; before?: string; sort?: EntrySort; offset?: number } = {}
): Promise<FormEntry[]> {
  const sql = getSql();
  const take = Math.min(Math.max(limit, 1), 500);
  const skip = Math.max(offset, 0);

  if (sort?.key === CREATED_KEY) {
    return sort.dir === "asc"
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

    return rows;
  }

  const rows = before
    ? ((await sql`
        SELECT id, form_id, answers, ip, user_agent, created_at
          FROM ctr_form_entries
         WHERE form_id = ${formId}
           AND created_at < ${before}
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

  return rows;
}

/** One entry, scoped by form. Read before an edit, to keep what it already holds. */
export async function getEntry(formId: string, entryId: string): Promise<FormEntry | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, form_id, answers, ip, user_agent, created_at
      FROM ctr_form_entries
     WHERE id = ${entryId} AND form_id = ${formId}
  `) as FormEntry[];

  return rows[0] ?? null;
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

  return rows[0] ?? null;
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
