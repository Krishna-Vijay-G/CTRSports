import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { getSql } from "@/lib/server/db";

/**
 * Proof that a submission came from a page this site served, and roughly when.
 *
 * The form page stamps each render with the time and a signature over it. The
 * submit route checks the signature — so the time cannot simply be made up —
 * and then checks the time itself. Two things fall out of that:
 *
 *   too fast   under three seconds is not somebody filling in a form. It is a
 *              script that fetched the page and posted it back, which is the
 *              cheapest bot there is and the one a honeypot alone misses.
 *   too slow   past two hours the page has been sitting open long enough that
 *              the form may since have closed. Reload and try again is a better
 *              answer than accepting an entry against a form that has moved on.
 *
 * It is NOT a CSRF token and does not try to be. There is nothing to protect
 * here — the endpoint takes anonymous entries by design, and a forged one is
 * indistinguishable from a real one however it arrives. This only raises the
 * cost of the laziest automation.
 *
 * With REGISTER_SECRET unset the check passes and says so once, which is the
 * same posture `isS3Configured` takes: a missing setting degrades a feature and
 * announces itself, rather than either failing every submission or pretending
 * the check ran.
 */

const MIN_FILL_MS = 3_000;
const MAX_AGE_MS = 2 * 60 * 60 * 1000;

let warned = false;

function secret(): string {
  const value = process.env.REGISTER_SECRET ?? "";

  if (!value && !warned) {
    warned = true;
    console.error(
      "[register] REGISTER_SECRET is not set — the timing check on entry forms is off."
    );
  }

  return value;
}

function sign(slug: string, issuedAt: number, key: string): string {
  return createHmac("sha256", key).update(`${slug}.${issuedAt}`).digest("base64url");
}

/** Stamped into the page for the browser to hand straight back. */
export function issueToken(slug: string): { nonce: string; issuedAt: number } {
  const key = secret();
  const issuedAt = Date.now();

  return { nonce: key ? sign(slug, issuedAt, key) : "", issuedAt };
}

export type TokenVerdict = "ok" | "too-fast" | "stale" | "bad";

export function checkToken(slug: string, nonce: unknown, issuedAt: unknown): TokenVerdict {
  const key = secret();
  if (!key) return "ok";

  const at = Number(issuedAt);
  if (!Number.isFinite(at) || typeof nonce !== "string" || !nonce) return "bad";

  const expected = Buffer.from(sign(slug, at, key));
  const actual = Buffer.from(nonce);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return "bad";

  const age = Date.now() - at;
  // A negative age means this server's own clock has moved backwards since it
  // issued the token — `issuedAt` is ours, not the visitor's. Treated as
  // too-fast rather than accepted, because a form that was rendered "in the
  // future" cannot have been filled in yet either way.
  if (age < MIN_FILL_MS) return "too-fast";
  if (age > MAX_AGE_MS) return "stale";

  return "ok";
}

/**
 * Spends a nonce, once.
 *
 * `checkToken` proves the token is genuine and recent; this proves it has not
 * been used before. They are separate calls because they belong at different
 * points in the request: the signature is worth checking before any database
 * work, and the nonce must only be SPENT on an attempt that is actually going
 * to be stored. Burning it on a validation failure would force a reload to fix
 * a typo — and a reload loses everything typed.
 *
 * Returns false when the nonce has already been spent, which is one of two
 * things: a replay, or a genuine retry after a response that never arrived. The
 * second is why the caller reports it as "already received" rather than as an
 * error — the entry is there.
 *
 * With no secret set there is no nonce to spend, and this passes, matching the
 * posture `checkToken` takes.
 */
export async function consumeToken(nonce: unknown, issuedAt: unknown): Promise<boolean> {
  if (!secret()) return true;
  if (typeof nonce !== "string" || !nonce) return false;

  const at = Number(issuedAt);
  const expiresAt = new Date((Number.isFinite(at) ? at : Date.now()) + MAX_AGE_MS).toISOString();

  const sql = getSql();

  const rows = (await sql`
    INSERT INTO ctr.form_nonces (nonce, expires_at)
    VALUES (${nonce.slice(0, 200)}, ${expiresAt})
    ON CONFLICT (nonce) DO NOTHING
    RETURNING nonce
  `) as { nonce: string }[];

  // Nothing schedules a clean-up, so it rides along with the writes. One in
  // fifty keeps the table small without putting a DELETE on every submission.
  if (Math.random() < 0.02) {
    await sql`DELETE FROM ctr.form_nonces WHERE expires_at < now()`.catch((error: unknown) => {
      console.error("[register] could not sweep spent nonces", error);
    });
  }

  return rows.length > 0;
}
