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
 * A key is pruned when it is next met, so nothing here keeps the process awake.
 * When the map fills, EXPIRED keys are swept first and only a still-full map is
 * cleared wholesale — clearing unconditionally meant filling it with junk keys
 * was itself a way to wipe everyone's counters, which is the one thing a
 * limiter must not let a caller do.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Past this many distinct keys the map is swept, then cleared if that failed. */
const MAX_KEYS = 5_000;

/** Drops every window that has already ended. Cheap, and usually enough. */
function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function take(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) {
      sweep(now);
      if (buckets.size >= MAX_KEYS) buckets.clear();
    }

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
 * ── Why not the first `x-forwarded-for` entry ─────────────────────────────
 *
 * Because the client writes it. `X-Forwarded-For` is a list that each proxy
 * APPENDS to, so the leftmost entry is whatever the original request claimed —
 * and a request can claim anything. Reading it meant a loop sending a fresh
 * random value on every attempt got a fresh counter every time, which nullified
 * the in-process burst limit AND the durable hourly cap, since the same string
 * is what `countRecentEntries` counts. Both defences, defeated by one header.
 *
 * The value this process can trust is the one its OWN proxy appended, which is
 * the last entry. Platform-specific headers are better still, because the
 * platform sets them from the connection rather than from the request, so they
 * are tried first.
 *
 * It is also written to the `ip` column on every entry, so this is not only a
 * counting key: a forgeable one made the stored provenance of every entry a
 * fiction. Still not an identity to *decide* anything about a person on — but
 * it should at least be an address someone actually connected from.
 *
 * A request with no address at all gets the literal "unknown", which shares one
 * bucket with every other such request — a missing header is not a free pass.
 */
export function callerIp(request: Request): string {
  // Set by the platform from the connection, not copied from the request.
  const platform =
    request.headers.get("x-vercel-forwarded-for") ?? request.headers.get("cf-connecting-ip");
  if (platform) return platform.trim().slice(0, 60);

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",");
    const nearest = hops[hops.length - 1]?.trim();
    if (nearest) return nearest.slice(0, 60);
  }

  const real = request.headers.get("x-real-ip");
  return real ? real.trim().slice(0, 60) : "unknown";
}
