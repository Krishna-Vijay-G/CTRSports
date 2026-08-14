import "server-only";

import { neon } from "@neondatabase/serverless";

/**
 * Neon over HTTP: one round-trip per query and no pool to manage, which is the
 * right shape for serverless where a long-lived pool would leak between
 * invocations.
 *
 * ── Where the tables are ──────────────────────────────────────────────────
 *
 * Every table this project owns lives in the `ctr` SCHEMA, and queries name them
 * unqualified — `FROM sports`, not `FROM ctr.sports`. They used to carry a
 * `ctr_` prefix instead, to keep open the option of sharing one database with
 * another CTR site; a schema is the mechanism Postgres provides for exactly that
 * and gives the clean names back. `ctr.sports` still works wherever being
 * explicit reads better.
 *
 * What makes the short names resolve is `search_path = ctr, public`, set on the
 * DATABASE by migrations/0001_baseline.sql. It has to be attached to the
 * database rather than issued per session, because over HTTP every query is its
 * own connection — a `SET search_path` here would be forgotten before the next
 * statement ran.
 *
 * The consequence worth knowing: a database that has not had 0001 applied fails
 * every query with `relation "sports" does not exist`. That is the intended
 * failure. `npm run db:status` names it directly, and it is loud rather than
 * subtle, which is the right way round for a database pointed at the wrong
 * place.
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
