import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { isSuperAdmin, adminHomePath } from "@/lib/adminRoles";
import { listAdminUsers } from "@/lib/server/adminUsersRepo";
import { UsersAdmin } from "./_components/UsersAdmin";

export const dynamic = "force-dynamic";

export default async function UsersAdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!isSuperAdmin(session.role)) redirect(adminHomePath(session.role));

  const users = await listAdminUsers();

  return <UsersAdmin initialUsers={users} currentUserId={session.adminId} />;
}
