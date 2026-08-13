import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

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
  // A negative age is a clock ahead of ours, not an attack worth a page about.
  if (age < MIN_FILL_MS && age > -MIN_FILL_MS) return "too-fast";
  if (age > MAX_AGE_MS) return "stale";

  return "ok";
}
