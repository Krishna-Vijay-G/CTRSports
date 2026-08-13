import "server-only";

import { normaliseAdminInput, type AdminAccount } from "@/lib/admins";
import { hashPassword } from "@/lib/server/auth";
import { getSql } from "@/lib/server/db";

/**
 * Every read and write of ctr_admins that is not the sign-in itself.
 *
 * `password_hash` is never in a column list here. That is the one rule this
 * file has: signing in reads it, in auth.ts, and nothing else ever needs it —
 * so it cannot be returned by accident to a screen, a route or a log line.
 *
 * Changing a password deletes that account's sessions, in the same transaction
 * as the change. Anything else would leave a browser signed in with a password
 * that no longer exists, which is exactly the situation someone is trying to
 * end when they change one.
 */

export async function listAdmins(): Promise<AdminAccount[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, username, role, pages, created_at
      FROM ctr_admins
     ORDER BY username ASC
  `) as AdminAccount[];

  return rows;
}

export async function getAdmin(id: string): Promise<AdminAccount | null> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, username, role, pages, created_at
      FROM ctr_admins
     WHERE id = ${id}
  `) as AdminAccount[];

  return rows[0] ?? null;
}

/**
 * How many owners there are.
 *
 * Asked before a demotion or a delete: an admin with no owner cannot make one,
 * because making one is a thing only an owner can do. That is a locked door
 * with the key inside, and the only fix is a shell and the create-admin script.
 */
export async function countOwners(): Promise<number> {
  const sql = getSql();
  const rows = (await sql`
    SELECT count(*)::int AS count FROM ctr_admins WHERE role = 'owner'
  `) as { count: number }[];

  return rows[0]?.count ?? 0;
}

export async function createAdmin(input: unknown, password: string): Promise<AdminAccount> {
  const sql = getSql();
  const account = normaliseAdminInput(input);
  const hash = await hashPassword(password);

  const rows = (await sql`
    INSERT INTO ctr_admins (username, password_hash, role, pages)
    VALUES (${account.username}, ${hash}, ${account.role}, ${JSON.stringify(account.pages)}::jsonb)
    RETURNING id, username, role, pages, created_at
  `) as AdminAccount[];

  return rows[0];
}

/**
 * Null when the id does not exist — the route turns that into a 404.
 *
 * A blank password means "leave it alone", which is what an edit of somebody's
 * pages should do. Only a non-blank one is written, and only then are their
 * sessions cleared.
 */
export async function updateAdmin(
  id: string,
  input: unknown,
  password: string
): Promise<AdminAccount | null> {
  const sql = getSql();
  const account = normaliseAdminInput(input);

  const rows = (await sql`
    UPDATE ctr_admins
       SET username = ${account.username},
           role     = ${account.role},
           pages    = ${JSON.stringify(account.pages)}::jsonb
     WHERE id = ${id}
    RETURNING id, username, role, pages, created_at
  `) as AdminAccount[];

  const updated = rows[0] ?? null;
  if (!updated || !password) return updated;

  const hash = await hashPassword(password);
  await sql`UPDATE ctr_admins SET password_hash = ${hash} WHERE id = ${id}`;
  await sql`DELETE FROM ctr_sessions WHERE admin_id = ${id}`;

  return updated;
}

/** Sessions go with it: the row is referenced ON DELETE CASCADE. */
export async function deleteAdmin(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    DELETE FROM ctr_admins WHERE id = ${id} RETURNING id
  `) as { id: string }[];

  return rows.length > 0;
}

/** Whether a username is already taken by someone else. */
export async function usernameTaken(username: string, exceptId?: string): Promise<boolean> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id FROM ctr_admins
     WHERE username = ${username}
       AND id <> ${exceptId ?? "00000000-0000-0000-0000-000000000000"}
  `) as { id: string }[];

  return rows.length > 0;
}
