import "server-only";

import {
  normaliseEnquiryStatus,
  type Enquiry,
  type EnquiryCounts,
  type EnquiryCursor,
  type EnquiryStatus,
  type StoredEnquiry,
} from "@/lib/enquiry";
import { getSql } from "@/lib/server/db";

/*
 * Re-exported so a server file can keep importing the row shape from the repo
 * that produces it. They are DEFINED in src/lib/enquiry.ts because the console
 * table is a client component and cannot import anything from behind
 * `server-only` — see the note there.
 */
export type { EnquiryCounts, EnquiryCursor, StoredEnquiry };

/**
 * Every read and write of ctr.enquiries.
 *
 * This file used to say there was no screen reading these, and that the gap was
 * written down rather than left to be discovered. There is one now —
 * /console/(protected)/enquiries — and it reads them from here, which is what
 * that note asked of whatever came next.
 *
 * ── Deleting is archiving ─────────────────────────────────────────────────
 *
 * Nothing in this file removes a row. The console's delete button calls
 * `archiveEnquiries`, which sets `archived_at`; the archive is a filter, and
 * restoring clears the column again. An enquiry is a stranger writing in, and
 * the two mistakes do not cost the same: an archive full of rubbish costs
 * disk, and a DELETE on the wrong row costs somebody nobody can now reply to.
 *
 * If a row ever genuinely has to go — an erasure request — that is a
 * deliberate DELETE run by hand, which is the right amount of friction for it.
 *
 * ── The ordering, and why the cursor is a pair ────────────────────────────
 *
 * Newest first, paged on `(created_at, id)` together. The id half is not
 * decoration: two enquiries can share a millisecond, and a cursor on the
 * timestamp alone steps over whichever of them lands on a page boundary. Same
 * rule, and the same reasoning, as `listEntries` in entriesRepo.
 */

const IP_MAX = 60;
const AGENT_MAX = 300;

/** The ceiling on one bulk action. Matches `MAX_BULK_DELETE` on the entries. */
export const MAX_BULK = 500;

/** Every column the admin reads. `RETURNING` and `SELECT` share one list. */
const COLUMNS = `id, name, email, message, status, archived_at, ip, user_agent, created_at`;

/**
 * `timestamptz` arrives as a Date. The types say string; this is the boundary.
 *
 * `archived_at` is nullable and stays null — an absent archive date is a real
 * value here, not a missing one, and coercing it to "" would make an archived
 * row indistinguishable from a live one.
 */
function hydrate(row: StoredEnquiry): StoredEnquiry {
  const at = row.created_at as unknown;
  const archived = row.archived_at as unknown;

  return {
    ...row,
    status: normaliseEnquiryStatus(row.status),
    created_at: at instanceof Date ? at.toISOString() : String(at ?? ""),
    archived_at:
      archived == null
        ? null
        : archived instanceof Date
          ? archived.toISOString()
          : String(archived),
  };
}

export async function createEnquiry(
  values: Enquiry,
  ip: string,
  userAgent: string
): Promise<StoredEnquiry> {
  const sql = getSql();

  const rows = (await sql`
    INSERT INTO ctr.enquiries (name, email, message, ip, user_agent)
    VALUES (
      ${values.name}, ${values.email}, ${values.message},
      ${ip.slice(0, IP_MAX)}, ${userAgent.slice(0, AGENT_MAX)}
    )
    RETURNING id, name, email, message, status, archived_at, ip, user_agent, created_at
  `) as StoredEnquiry[];

  return hydrate(rows[0]);
}

/**
 * How many have arrived from one address in the last hour.
 *
 * The durable half of the rate limit. The in-process one in rateLimit.ts is a
 * Map that a deploy empties and that every instance keeps its own copy of; this
 * is a count of what actually landed, so it holds however many instances are
 * running. The same pairing the registration route uses.
 *
 * Archived rows still count. Somebody tidying up the console must not quietly
 * refill a spammer's allowance.
 */
export async function countRecentEnquiries(ip: string, hours = 1): Promise<number> {
  const sql = getSql();

  const rows = (await sql`
    SELECT count(*)::int AS total
      FROM ctr.enquiries
     WHERE ip = ${ip.slice(0, IP_MAX)}
       AND created_at > now() - (${hours} * interval '1 hour')
  `) as { total: number }[];

  return rows[0]?.total ?? 0;
}

/**
 * One page of the list.
 *
 * Built as text with positional parameters rather than as a tagged template,
 * because the WHERE clause has three optional halves and a template cannot
 * grow one. Every value still travels as a parameter — nothing here is
 * interpolated into the SQL but the parameter's own number.
 */
export async function listEnquiries(options: {
  limit: number;
  /** Absent means every state. */
  status?: EnquiryStatus;
  /** false — the default — is the working list. true is the archive. */
  archived?: boolean;
  before?: EnquiryCursor;
}): Promise<StoredEnquiry[]> {
  const sql = getSql();

  const where: string[] = [
    options.archived ? "archived_at IS NOT NULL" : "archived_at IS NULL",
  ];
  const params: unknown[] = [];

  if (options.status) {
    params.push(options.status);
    where.push(`status = $${params.length}`);
  }

  if (options.before) {
    params.push(options.before.at, options.before.id);
    where.push(
      `(created_at, id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`
    );
  }

  params.push(Math.max(1, Math.trunc(options.limit)));

  const rows = (await sql.query(
    `SELECT ${COLUMNS}
       FROM ctr.enquiries
      WHERE ${where.join(" AND ")}
      ORDER BY created_at DESC, id DESC
      LIMIT $${params.length}`,
    params
  )) as StoredEnquiry[];

  return rows.map(hydrate);
}

/**
 * Every count the toolbar shows, in one query.
 *
 * One round trip rather than four. The three statuses are counted over the
 * working list only — an archived enquiry is not "unread" in any sense the
 * person reading the chips cares about — and the archive is counted whole.
 */
export async function countEnquiries(): Promise<EnquiryCounts> {
  const sql = getSql();

  const rows = (await sql`
    SELECT
      count(*) FILTER (WHERE archived_at IS NULL AND status = 'unread')::int      AS unread,
      count(*) FILTER (WHERE archived_at IS NULL AND status = 'in_progress')::int AS in_progress,
      count(*) FILTER (WHERE archived_at IS NULL AND status = 'resolved')::int    AS resolved,
      count(*) FILTER (WHERE archived_at IS NOT NULL)::int                        AS archived
      FROM ctr.enquiries
  `) as EnquiryCounts[];

  return (
    rows[0] ?? { unread: 0, in_progress: 0, resolved: 0, archived: 0 }
  );
}

/**
 * Moves enquiries between states.
 *
 * Returns how many rows actually changed, which is not always how many ids were
 * sent: another admin may have archived one in the meantime. The screen reports
 * the server's number rather than the length of its own list, so a total cannot
 * drift away from the table underneath it.
 */
export async function setEnquiryStatus(
  ids: readonly string[],
  status: EnquiryStatus
): Promise<number> {
  if (ids.length === 0) return 0;

  const sql = getSql();

  const rows = (await sql`
    UPDATE ctr.enquiries
       SET status = ${status}
     WHERE id = ANY(${ids as string[]}::uuid[])
       AND status <> ${status}
    RETURNING id
  `) as { id: string }[];

  return rows.length;
}

/**
 * The delete button. Sets the date; removes nothing.
 *
 * Already-archived rows are excluded rather than re-stamped, so archiving twice
 * does not move the date and lose when it actually happened.
 */
export async function archiveEnquiries(ids: readonly string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const sql = getSql();

  const rows = (await sql`
    UPDATE ctr.enquiries
       SET archived_at = now()
     WHERE id = ANY(${ids as string[]}::uuid[])
       AND archived_at IS NULL
    RETURNING id
  `) as { id: string }[];

  return rows.length;
}

/** The other direction. The status it had is still on the row, untouched. */
export async function restoreEnquiries(ids: readonly string[]): Promise<number> {
  if (ids.length === 0) return 0;

  const sql = getSql();

  const rows = (await sql`
    UPDATE ctr.enquiries
       SET archived_at = NULL
     WHERE id = ANY(${ids as string[]}::uuid[])
       AND archived_at IS NOT NULL
    RETURNING id
  `) as { id: string }[];

  return rows.length;
}
