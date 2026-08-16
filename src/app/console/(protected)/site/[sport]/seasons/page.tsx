import { SITE } from "@/config/site";
import { requireSite } from "@/lib/server/access";
import { listSeasons } from "@/lib/server/seasonsRepo";
import { SeasonsEditor } from "@/admin/screens/seasons/SeasonsEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sport: string }> };

/**
 * One sport's seasons.
 *
 * Guarded on `events`, not on a module of its own: whoever may announce a
 * weekend may announce the year it runs in, and a separate grant would mean an
 * account that can add rounds to a season it cannot create.
 *
 * Deliberately uses the throwing loader: an editor that quietly showed no
 * seasons after a failed read would invite somebody to announce the same year a
 * second time — and the second one would take the address, leaving the real
 * season with `2026-2`.
 */
export default async function SeasonsAdminPage({ params }: Props) {
  const { sport } = await params;
  const { site } = await requireSite(sport, "events");

  const seasons = await listSeasons(site.id);

  /*
   * The public origin, handed down rather than imported by the editor. The admin
   * answers on its own hostname, so a relative link to /calendar/<slug> from an
   * admin screen would resolve against the ADMIN host, where the public routes
   * do not exist. SITE.url is built from an environment variable that is not
   * NEXT_PUBLIC, so it is only readable on the server.
   */
  return (
    <SeasonsEditor
      initialSeasons={seasons}
      siteUrl={`${SITE.url}${site.kind === "root" ? "" : `/${site.slug}`}`}
    />
  );
}
