import "server-only";

import { cache } from "react";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getSql } from "@/lib/server/db";
import { isAdminRoleId, type AdminRoleId, DEFAULT_ADMIN_ROLE } from "@/lib/adminRoles";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

export const SESSION_COOKIE = "ctr_admin_session";
const SESSION_TTL_DAYS = 7;
const KEY_LENGTH = 64;

/* ─── Password hashing ─── */

/** Stored form: `scrypt:<saltHex>:<keyHex>` */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;

  const expected = Buffer.from(keyHex, "hex");
  const actual = await scrypt(password, Buffer.from(saltHex, "hex"), expected.length);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/* ─── Sessions ─── */

/** Only the hash is persisted, so a database leak cannot be replayed as a login. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(adminId: string): Promise<void> {
  const sql = getSql();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO admin_sessions (token_hash, admin_id, expires_at)
    VALUES (${hashToken(token)}, ${adminId}, ${expiresAt.toISOString()})
  `;

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export type AdminSession = { adminId: string; username: string; role: AdminRoleId };

/**
 * `cache()` dedupes repeated calls within one request — the layout that gates
 * `/admin/*` and the page inside it both call this, and should cost one query
 * between them, not two.
 */
export const getSession = cache(async (): Promise<AdminSession | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT u.id AS admin_id, u.username, u.role
        FROM admin_sessions s
        JOIN admin_users u ON u.id = s.admin_id
       WHERE s.token_hash = ${hashToken(token)}
         AND s.expires_at > now()
    `) as { admin_id: string; username: string; role: string }[];

    const row = rows[0];
    if (!row) return null;

    return {
      adminId: row.admin_id,
      username: row.username,
      role: isAdminRoleId(row.role) ? row.role : DEFAULT_ADMIN_ROLE,
    };
  } catch {
    return null;
  }
});

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    try {
      const sql = getSql();
      await sql`DELETE FROM admin_sessions WHERE token_hash = ${hashToken(token)}`;
    } catch {
      // Cookie still gets cleared below; a stale row expires on its own.
    }
  }

  jar.delete(SESSION_COOKIE);
}

/** Best-effort cleanup so the sessions table does not grow without bound. */
export async function pruneExpiredSessions(): Promise<void> {
  try {
    const sql = getSql();
    await sql`DELETE FROM admin_sessions WHERE expires_at < now()`;
  } catch {
    // Non-critical.
  }
}
