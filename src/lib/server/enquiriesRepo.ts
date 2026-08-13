import "server-only";

import type { Enquiry } from "@/lib/enquiry";
import { getSql } from "@/lib/server/db";

/**
 * Every read and write of ctr_enquiries — which for now is one write and one
 * count.
 *
 * There is no screen that reads these yet. That is a gap and it is written down
 * here rather than left to be discovered: the messages are being stored, so
 * nothing a visitor sends is lost, and whatever reads them later reads them
 * from this file.
 */

const IP_MAX = 60;
const AGENT_MAX = 300;

export type StoredEnquiry = Enquiry & {
  id: string;
  handled: boolean;
  created_at: string;
};

/** `timestamptz` arrives as a Date. The type says string; this is the boundary. */
function hydrate(row: StoredEnquiry): StoredEnquiry {
  const at = row.created_at as unknown;

  return {
    ...row,
    created_at: at instanceof Date ? at.toISOString() : String(at ?? ""),
  };
}

export async function createEnquiry(
  values: Enquiry,
  ip: string,
  userAgent: string
): Promise<StoredEnquiry> {
  const sql = getSql();

  const rows = (await sql`
    INSERT INTO ctr_enquiries (name, email, message, ip, user_agent)
    VALUES (
      ${values.name}, ${values.email}, ${values.message},
      ${ip.slice(0, IP_MAX)}, ${userAgent.slice(0, AGENT_MAX)}
    )
    RETURNING id, name, email, message, handled, created_at
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
 */
export async function countRecentEnquiries(ip: string, hours = 1): Promise<number> {
  const sql = getSql();

  const rows = (await sql`
    SELECT count(*)::int AS total
      FROM ctr_enquiries
     WHERE ip = ${ip.slice(0, IP_MAX)}
       AND created_at > now() - (${hours} * interval '1 hour')
  `) as { total: number }[];

  return rows[0]?.total ?? 0;
}
