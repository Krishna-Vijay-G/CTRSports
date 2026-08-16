import { requireOwner } from "@/lib/server/access";
import { listSites } from "@/lib/server/sitesRepo";
import { SitesEditor } from "@/admin/screens/sites/SitesEditor";

export const dynamic = "force-dynamic";

/**
 * The sports.
 *
 * This address used to redirect to the root: the sports CARDS had a screen of
 * their own, and it was folded into the landing editor where they sit beside a
 * preview of the page they appear on. Those cards are still there.
 *
 * What lives here now is a different thing with the same name — the SITES. A
 * card is a picture and a line of copy on the landing page; a site is a URL
 * prefix, a media folder, a set of screens and a permission scope. They are
 * related only in that a card usually points at one, which is what
 * `ctr.sports.site_id` records.
 */
export default async function SportsAdminPage() {
  await requireOwner();
  const sites = await listSites();

  return <SitesEditor initialSites={sites} />;
}
