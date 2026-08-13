import "server-only";

/**
 * A speed bump for the one endpoint a stranger can post to.
 *
 * ── What this is not ──────────────────────────────────────────────────────
 *
 * It is a Map in one process. On a platform that runs several instances, each
 * keeps its own count, so a flood spread across them gets one budget per
 * instance rather than one overall — and a deploy or a cold start empties it.
 * That is worth saying out loud rather than leaving the next person to assume
 * otherwise.
 *
 * What it does stop is the thing that actually happens: a script, or a stuck
 * button, hammering one form from one address. What it does not stop is a
 * botnet, and nothing in a web process can. The durable half of the answer is
 * `countRecentEntries` in entriesRepo — a count of what really landed, which
 * holds however many instances there are.
 *
 * Entries are pruned as they are met rather than on a timer, so nothing here
 * keeps the process awake. The map is capped and cleared wholesale when it
 * overflows: blunt, but bounded, and losing the counts is a worse outcome for
 * an attacker than for anyone else.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Past this many distinct keys the map is cleared rather than grown. */
const MAX_KEYS = 5_000;

export function take(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) buckets.clear();
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;

  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  return { ok: true, retryAfter: 0 };
}

/**
 * The caller's address, as well as it can be known behind a proxy.
 *
 * `x-forwarded-for` is a list and the first entry is the original client. It is
 * also a header anyone can send, so this is a key for counting, never an
 * identity for deciding anything.
 *
 * A request with no address at all gets the literal "unknown", which shares one
 * bucket with every other such request — a missing header is not a free pass.
 */
export function callerIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim().slice(0, 60);

  const real = request.headers.get("x-real-ip");
  return real ? real.trim().slice(0, 60) : "unknown";
}
