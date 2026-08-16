import { requireEnquiries } from "@/lib/server/access";
import { countEnquiries, listEnquiries } from "@/lib/server/enquiriesRepo";
import { EnquiriesTable } from "@/admin/screens/enquiries/EnquiriesTable";

export const dynamic = "force-dynamic";

/** The same page size the route hands out. They have to agree — see below. */
const PAGE = 50;

/**
 * The messages people send from the footer, across every sport.
 *
 * A global screen like /media and /admins, and global for a reason that is in
 * the schema rather than in taste: `ctr.enquiries` has no `site_id`, because the
 * footer's message box is on every page of every site. There is no per-sport
 * version of this screen to build.
 *
 * The first page is rendered on the server and everything after it is fetched,
 * which is why `PAGE` is repeated here — the client works out whether there is
 * more by asking whether it got a full page, and a server that sent 40 where the
 * route sends 50 would make it stop one page early.
 */
export default async function EnquiriesAdminPage() {
  await requireEnquiries();

  const [enquiries, counts] = await Promise.all([
    listEnquiries({ limit: PAGE }),
    countEnquiries(),
  ]);

  const last = enquiries[enquiries.length - 1];

  return (
    <EnquiriesTable
      initialEnquiries={enquiries}
      initialCursor={
        enquiries.length === PAGE && last ? { at: last.created_at, id: last.id } : null
      }
      initialCounts={counts}
    />
  );
}
