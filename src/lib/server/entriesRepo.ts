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
 */

/** A header is somebody's to write. Neither of these is ever trusted for length. */
const IP_MAX = 60;
const AGENT_MAX = 300;

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
 * One page of entries, newest first.
 *
 * `before` is the created_at of the last row already shown. The id is the
 * tie-break, because two entries can land in the same millisecond and a cursor
 * on the timestamp alone would either repeat one or skip one.
 */
export async function listEntries(
  formId: string,
  { limit = 50, before }: { limit?: number; before?: string } = {}
): Promise<FormEntry[]> {
  const sql = getSql();
  const take = Math.min(Math.max(limit, 1), 500);

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
