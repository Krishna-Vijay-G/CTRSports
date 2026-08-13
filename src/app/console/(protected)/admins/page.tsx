import { requireOwner } from "@/lib/server/access";
import { listAdmins } from "@/lib/server/adminsRepo";
import { AdminsEditor } from "@/admin/screens/admins/AdminsEditor";

export const dynamic = "force-dynamic";

/**
 * Who can sign in.
 *
 * Owners only, and `requireOwner` answers `notFound()` for everyone else — the
 * screen is not there rather than there-and-refusing, which is also what the
 * navigation shows.
 *
 * The throwing loader, like the other record screens: an editor that quietly
 * showed an empty list after a failed read would invite someone to make a
 * second account with the same name.
 */
export default async function AdminsAdminPage() {
  const session = await requireOwner();
  const admins = await listAdmins();

  return <AdminsEditor initialAdmins={admins} currentAdminId={session.adminId} />;
}
