import "server-only";

import { neon } from "@neondatabase/serverless";

/**
 * Neon over HTTP: one round-trip per query and no pool to manage, which is the
 * right shape for serverless where a long-lived pool would leak between
 * invocations.
 *
 * Every table this project owns is prefixed `ctr_`. This database is currently
 * its own — separate from the older CTR site's — but the prefix costs nothing
 * and means the two could share one later without a rename. Keep it on anything
 * new.
 */
let cached: ReturnType<typeof neon> | null = null;

export function getSql() {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to .env locally and to the hosting project's environment."
    );
  }

  cached = neon(url);
  return cached;
}
