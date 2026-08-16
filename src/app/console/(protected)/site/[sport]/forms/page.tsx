import { requireSite } from "@/lib/server/access";
import { listForms } from "@/lib/server/formsRepo";
import { FormsEditor } from "@/admin/screens/forms/FormsEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sport: string }> };

/**
 * One sport's registration forms.
 *
 * `canManage` used to tell a registrations admin apart from a page editor who
 * could see the list but not build one. That distinction was a ROLE, and roles
 * do not carry a sport — so it is a grant now, and holding `forms` on this site
 * is the whole of it. Anyone who reaches this screen may manage what is on it;
 * anyone who may not never gets a row in the navigation.
 */
export default async function FormsAdminPage({ params }: Props) {
  const { sport } = await params;
  const { site } = await requireSite(sport, "forms");

  const forms = await listForms([site.id]);

  return <FormsEditor initialForms={forms} canManage />;
}
