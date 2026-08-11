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
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold uppercase tracking-wide text-white">
          Sports
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/50">
          These are the cards in the “Sports in CTR Unified” section of the landing page. Everything
          else on that page — the hero, the about copy, the footer links — is set in the code and
          changes with a deploy.
        </p>
      </div>

      <SportsAdmin initialSports={sports} />
    </>
  );
}
