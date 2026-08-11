import { listAllSports } from "@/lib/server/sportsRepo";
import { SportsAdmin } from "./_components/SportsAdmin";

export const dynamic = "force-dynamic";

/**
 * The sport cards. Deliberately throws if the database is unreachable rather
 * than rendering an empty list — an admin shown "no sports" would add them all
 * over again.
 */
export default async function SportsAdminPage() {
  const sports = await listAllSports();

  return (
    <div className="h-full overflow-y-auto px-4 py-5 sm:px-6">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-white">Sports</h1>
        <p className="text-[11px] text-white/35">
          The cards in the sports section. The heading above them is on the Landing page screen.
        </p>
      </div>

      <SportsAdmin initialSports={sports} />
    </div>
  );
}
