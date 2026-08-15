import "server-only";

import {
  CREATED_COLUMN,
  fileOf,
  type EntryCursor,
  type FormEntry,
  type Submission,
} from "@/lib/forms";
import { getSql } from "@/lib/server/db";

/**
 * Every read and write of ctr.form_entries.
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
 *
 * ── The answers are rows now ──────────────────────────────────────────────
 *
 * `answers` was a flat JSONB map on this table. It is `form_entry_answers`, one
 * row per answer, and `Submission` — the shape everything above this file reads
 * — is rebuilt from it on the way out. That is the whole trade: nothing outside
 * this repo learns that the storage changed, and sorting by an answer stops
 * being an unindexable regex-and-cast over `answers->>key`.
 *
 * A file answer keeps its encoded `file::{…}` form in the assembled map, so
 * `fileOf`, the CSV writer and the entries table are untouched — but the S3 key
 * now also lives in a column of its own, which is what lets `deleteForm` find
 * every attachment with one indexed select instead of parsing every answer of
 * every entry.
 */

/**
 * `Submission`, rebuilt out of the answer rows.
 *
 * `is_list` and not `count(*) > 1`, because a checkbox group with one box
 * ticked is `["yes"]` and not `"yes"`, and row count cannot tell those apart.
 *
 * The LEFT JOIN is what re-encodes a file. An answer with a row in
 * `form_entry_files` reads back as the same `file::{…}` string it was stored
 * as, so nothing above this file has to know the difference.
 */
const ANSWERS = `
  (SELECT coalesce(jsonb_object_agg(field_id, value), '{}'::jsonb)
     FROM (
       SELECT a.field_id,
              CASE WHEN bool_or(a.is_list)
                   THEN jsonb_agg(to_jsonb(shown.text) ORDER BY a.idx)
                   ELSE to_jsonb(min(shown.text)) END AS value
         FROM ctr.form_entry_answers a
         LEFT JOIN ctr.form_entry_files f
                ON f.entry_id = a.entry_id AND f.field_id = a.field_id AND f.idx = a.idx
         CROSS JOIN LATERAL (
           SELECT CASE
             WHEN f.s3_key IS NOT NULL
             THEN 'file::' || jsonb_build_object(
                    'key', f.s3_key, 'name', f.file_name, 'size', f.size_bytes)::text
             ELSE a.value_text END AS text
         ) AS shown
        WHERE a.entry_id = e.id
        GROUP BY a.field_id
     ) AS one_answer) AS answers`;

/** Every column of the entry itself. The answers are joined on. */
const COLUMNS = `e.id, e.form_id, e.ip, e.user_agent, e.created_at`;

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

/**
 * The rows one submission becomes.
 *
 * `value_num` and `value_date` are decided HERE, once, rather than on every
 * read: that is what turns sorting the entries table from a regex and a cast
 * per row into an index scan. An answer that is not a number leaves `value_num`
 * NULL, and NULLs sort last whichever way round the column is ordered.
 */
function rowsOf(answers: Submission): {
  field: string;
  idx: number;
  isList: boolean;
  text: string;
  num: number | null;
  date: string | null;
  file: { key: string; name: string; size: number } | null;
}[] {
  const NUMBER = /^-?[0-9]+([.][0-9]+)?$/;
  const DATE = /^\d{4}-\d{2}-\d{2}$/;

  return Object.entries(answers).flatMap(([field, value]) => {
    const many = Array.isArray(value);
    const list = many ? value : [value];

    return list.map((entry, idx) => {
      const text = typeof entry === "string" ? entry : "";
      const file = fileOf(text);

      return {
        field,
        idx,
        isList: many,
        // A file's own name is what the table and the CSV print. The key is in
        // its own column beside it rather than encoded into this one.
        text: file ? file.name : text,
        num: !file && NUMBER.test(text) ? Number(text) : null,
        date: !file && DATE.test(text) ? text : null,
        file,
      };
    });
  });
}

/** Writes one entry's answers. Called inside the same transaction as the row. */
function writeAnswers(id: string, answers: Submission) {
  const sql = getSql();
  const rows = rowsOf(answers);

  return [
    sql`DELETE FROM ctr.form_entry_answers WHERE entry_id = ${id}`,
    sql`DELETE FROM ctr.form_entry_files WHERE entry_id = ${id}`,
    ...rows.map(
      (row) => sql`
        INSERT INTO ctr.form_entry_answers (entry_id, field_id, idx, is_list, value_text, value_num, value_date)
        VALUES (${id}, ${row.field}, ${row.idx}, ${row.isList}, ${row.text},
                ${row.num}, ${row.date})
      `
    ),
    ...rows
      .filter((row) => row.file)
      .map(
        (row) => sql`
          INSERT INTO ctr.form_entry_files (entry_id, field_id, idx, s3_key, file_name, size_bytes)
          VALUES (${id}, ${row.field}, ${row.idx}, ${row.file!.key}, ${row.file!.name},
                  ${row.file!.size})
        `
      ),
  ];
}

export async function createEntry(
  formId: string,
  answers: Submission,
  ip: string,
  userAgent: string
): Promise<FormEntry> {
  const sql = getSql();

  const rows = (await sql`
    INSERT INTO ctr.form_entries (form_id, ip, user_agent)
    VALUES (${formId}, ${ip.slice(0, IP_MAX)}, ${userAgent.slice(0, AGENT_MAX)})
    RETURNING id
  `) as { id: string }[];

  // An INSERT … RETURNING that comes back empty is not a row we can pretend to
  // have: returning `undefined` here made the caller's notification throw AFTER
  // the entry was already committed.
  if (!rows[0]) throw new Error("The entry was not written.");

  await sql.transaction(writeAnswers(rows[0].id, answers));

  const written = await getEntry(formId, rows[0].id);
  if (!written) throw new Error("The entry was not written.");
  return written;
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
    INSERT INTO ctr.form_entries (form_id, ip, user_agent)
    SELECT ${formId}, ${ip.slice(0, IP_MAX)}, ${userAgent.slice(0, AGENT_MAX)}
     WHERE (SELECT count(*) FROM ctr.form_entries WHERE form_id = ${formId}) < ${cap}
    RETURNING id
  `) as { id: string }[];

  if (!rows[0]) return null;

  await sql.transaction(writeAnswers(rows[0].id, answers));

  return getEntry(formId, rows[0].id);
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
    const rows = (await sql.query(
      `SELECT ${COLUMNS}, ${ANSWERS}
         FROM ctr.form_entries e
        WHERE e.form_id = $1
        ORDER BY e.created_at ${sort.dir === "asc" ? "ASC" : "DESC"},
                 e.id ${sort.dir === "asc" ? "ASC" : "DESC"}
        LIMIT $2 OFFSET $3`,
      [formId, take, skip]
    )) as FormEntry[];

    return rows.map(hydrate);
  }

  if (sort) {
    /*
     * The sort terms are a LEFT JOIN on to the answer rows rather than an
     * expression over a JSONB blob, which is the whole point of the entries
     * table having become a table:
     *
     *   was   ORDER BY (CASE WHEN answers->>$k ~ '^-?[0-9]+…$'
     *                        THEN (answers->>$k)::numeric END), lower(answers->>$k)
     *   now   ORDER BY a.value_num, lower(a.value_text)
     *
     * with an index on each of `(field_id, value_num)` and
     * `(field_id, lower(value_text))`. The regex and the cast decided, per row
     * on every read, something that is now decided once when the entry is
     * written.
     *
     * Numbers first and words after, so an age column sorts 9 before 10 rather
     * than the other way round. An entry that did not answer this question has
     * no row to join to, and NULLs go last whichever direction is asked for.
     *
     * OFFSET rather than a cursor, unchanged: a keyset needs the thing it points
     * at to be unique, and "Priya" is not.
     */
    const direction = sort.dir === "asc" ? "ASC" : "DESC";

    const rows = (await sql.query(
      `SELECT ${COLUMNS}, ${ANSWERS}
         FROM ctr.form_entries e
         LEFT JOIN ctr.form_entry_answers a
                ON a.entry_id = e.id AND a.field_id = $2 AND a.idx = 0
        WHERE e.form_id = $1
        ORDER BY a.value_num ${direction} NULLS LAST,
                 lower(nullif(a.value_text, '')) ${direction} NULLS LAST,
                 e.created_at DESC, e.id DESC
        LIMIT $3 OFFSET $4`,
      [formId, sort.key, take, skip]
    )) as FormEntry[];

    return rows.map(hydrate);
  }

  const rows = before
    ? ((await sql.query(
        `SELECT ${COLUMNS}, ${ANSWERS}
           FROM ctr.form_entries e
          WHERE e.form_id = $1
            -- Both halves, compared as a row: this is the tie-break the note
            -- above promises, and without it rows sharing a timestamp with the
            -- last one on screen were skipped for good.
            AND (e.created_at, e.id) < ($2::timestamptz, $3::uuid)
          ORDER BY e.created_at DESC, e.id DESC
          LIMIT $4`,
        [formId, before.at, before.id, take]
      )) as FormEntry[])
    : ((await sql.query(
        `SELECT ${COLUMNS}, ${ANSWERS}
           FROM ctr.form_entries e
          WHERE e.form_id = $1
          ORDER BY e.created_at DESC, e.id DESC
          LIMIT $2`,
        [formId, take]
      )) as FormEntry[]);

  return rows.map(hydrate);
}

/** One entry, scoped by form. Read before an edit, to keep what it already holds. */
export async function getEntry(formId: string, entryId: string): Promise<FormEntry | null> {
  const sql = getSql();
  const rows = (await sql.query(
    `SELECT ${COLUMNS}, ${ANSWERS}
       FROM ctr.form_entries e
      WHERE e.id = $1 AND e.form_id = $2`,
    [entryId, formId]
  )) as FormEntry[];

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

  // Scoped by form before anything is written: the answers table has no
  // form_id of its own, so this is what stops an id from one screen reaching
  // into another form's entries.
  const rows = (await sql`
    SELECT id FROM ctr.form_entries WHERE id = ${entryId} AND form_id = ${formId}
  `) as { id: string }[];

  if (rows.length === 0) return null;

  await sql.transaction(writeAnswers(entryId, answers));

  return getEntry(formId, entryId);
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
    SELECT count(*)::int AS count FROM ctr.form_entries WHERE form_id = ${formId}
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
      FROM ctr.form_entries
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
    DELETE FROM ctr.form_entries
     WHERE id = ${entryId} AND form_id = ${formId}
    RETURNING id
  `) as { id: string }[];

  return rows.length > 0;
}

/**
 * Several at once, in one statement — all of them or none.
 *
 * `= ANY` over an array rather than a statement per id inside a transaction:
 * five hundred ticked boxes were five hundred round trips, and the answers and
 * the files go with each row on the foreign key regardless.
 *
 * Scoped by form, so a list of ids gathered from one screen cannot reach into
 * another form's entries. Returns how many actually went, which is not always
 * how many were named — somebody else may have deleted one already.
 */
export async function deleteEntries(formId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const sql = getSql();
  const wanted = ids.slice(0, MAX_BULK_DELETE);

  const rows = (await sql`
    DELETE FROM ctr.form_entries
     WHERE form_id = ${formId} AND id = ANY(${wanted}::uuid[])
    RETURNING id
  `) as { id: string }[];

  return rows.length;
}
