import "server-only";

import { cache } from "react";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { getSql } from "@/lib/server/db";
import { normalisePageKeys, normaliseRole, type AdminRole, type PageKey } from "@/lib/roles";

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: Buffer,
  keylen: number
) => Promise<Buffer>;

export const SESSION_COOKIE = "ctr_session";
const SESSION_TTL_DAYS = 7;
const KEY_LENGTH = 64;

/* ─── Passwords ─── */

/** Stored form: `scrypt:<saltHex>:<keyHex>`. Written by scripts/create-admin.mjs. */
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

/** Only the hash is stored, so a leaked table cannot be replayed as a login. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(adminId: string): Promise<void> {
  const sql = getSql();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await sql`
    INSERT INTO ctr.sessions (token_hash, admin_id, expires_at)
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

/**
 * Who is signed in, and what they may touch.
 *
 * The role travels with the session rather than being looked up where it is
 * needed: a screen and the route behind it both have to ask, and two lookups
 * are two chances to ask different questions. `src/lib/roles.ts` is where the
 * answer is interpreted; this only carries it.
 */
export type AdminSession = {
  adminId: string;
  username: string;
  role: AdminRole;
  pages: PageKey[];
};

/**
 * `cache()` dedupes within a single request — the layout that gates /admin and
 * the page inside it both ask, and that should cost one query, not two.
 */
export const getSession = cache(async (): Promise<AdminSession | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT a.id AS admin_id, a.username, a.role,
             (SELECT coalesce(jsonb_agg(p.page_key ORDER BY k.sort_order), '[]'::jsonb)
                FROM ctr.admin_pages p JOIN ctr.pages k ON k.key = p.page_key
               WHERE p.admin_id = a.id) AS pages
        FROM ctr.sessions s
        JOIN ctr.admins a ON a.id = s.admin_id
       WHERE s.token_hash = ${hashToken(token)}
         AND s.expires_at > now()
    `) as { admin_id: string; username: string; role: unknown; pages: unknown }[];

    const row = rows[0];
    if (!row) return null;

    // Normalised here rather than trusted: the column has no CHECK constraint,
    // deliberately, so this is where an unknown role becomes the least
    // privileged one instead of an unhandled string.
    return {
      adminId: row.admin_id,
      username: row.username,
      role: normaliseRole(row.role),
      pages: normalisePageKeys(row.pages),
    };
  } catch {
    // A database that is down reads as "not signed in", which sends the visitor
    // to the login screen rather than showing a stack trace.
    return null;
  }
});

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;

  if (token) {
    try {
      await getSql()`DELETE FROM ctr.sessions WHERE token_hash = ${hashToken(token)}`;
    } catch {
      // The cookie is cleared below regardless; the row expires on its own.
    }
  }

  jar.delete(SESSION_COOKIE);
}

/** Best-effort cleanup so the sessions table does not grow without bound. */
export async function pruneExpiredSessions(): Promise<void> {
  try {
    await getSql()`DELETE FROM ctr.sessions WHERE expires_at < now()`;
  } catch {
    // Non-critical.
  }
}
