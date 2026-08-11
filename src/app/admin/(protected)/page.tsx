import { listAllSports } from "@/lib/server/sportsRepo";
import { SportsAdmin } from "./_components/SportsAdmin";

export const dynamic = "force-dynamic";

/**
 * The whole dashboard. One screen, one table.
 *
 * If the database is unreachable this deliberately throws rather than rendering
 * an empty list — an admin shown "no sports" would add them all again.
 */
export default async function AdminHomePage() {
  const sports = await listAllSports();

  return (
    <>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="font-display text-xl font-bold uppercase tracking-wide text-white">
          Sports
        </h1>
        <p className="text-xs text-white/40">
          The cards in the “Sports in CTR Unified” section. Everything else on the page is set in
          code.
        </p>
      </div>

      <SportsAdmin initialSports={sports} />
    </>
  );
}
