import "server-only";

import { getSql } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/auth";
import type { AdminRoleId } from "@/lib/adminRoles";

export type AdminUser = {
  id: string;
  username: string;
  role: AdminRoleId;
  created_at: string;
};

type AdminUserRow = Omit<AdminUser, "created_at"> & { created_at: string | Date };

function toAdminUser(row: AdminUserRow): AdminUser {
  return { ...row, created_at: new Date(row.created_at).toISOString() };
}

/** Every admin account, newest first — the roster at `/admin/users`. */
export async function listAdminUsers(): Promise<AdminUser[]> {
  const sql = getSql();
  const rows = (await sql`
    SELECT id, username, role, created_at FROM admin_users ORDER BY created_at DESC
  `) as AdminUserRow[];
  return rows.map(toAdminUser);
}

export type CreateAdminUserResult =
  | { ok: true; user: AdminUser }
  | { ok: false; error: "username_taken" };

export async function createAdminUser(
  username: string,
  password: string,
  role: AdminRoleId
): Promise<CreateAdminUserResult> {
  const sql = getSql();
  const hash = await hashPassword(password);

  const existing = (await sql`SELECT id FROM admin_users WHERE username = ${username}`) as { id: string }[];
  if (existing[0]) return { ok: false, error: "username_taken" };

  const rows = (await sql`
    INSERT INTO admin_users (username, password_hash, role)
    VALUES (${username}, ${hash}, ${role})
    RETURNING id, username, role, created_at
  `) as AdminUserRow[];

  return { ok: true, user: toAdminUser(rows[0]) };
}

/** Changing a role invalidates existing sessions, so the new permissions take effect immediately. */
export async function updateAdminUserRole(id: string, role: AdminRoleId): Promise<AdminUser | null> {
  const sql = getSql();
  const rows = (await sql`
    UPDATE admin_users SET role = ${role} WHERE id = ${id}
    RETURNING id, username, role, created_at
  `) as AdminUserRow[];

  if (!rows[0]) return null;
  await sql`DELETE FROM admin_sessions WHERE admin_id = ${id}`;
  return toAdminUser(rows[0]);
}
