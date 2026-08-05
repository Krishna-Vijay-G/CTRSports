import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { canManageRegistrations, adminHomePath } from "@/lib/adminRoles";
import { listRegistrations } from "@/lib/server/registrationsRepo";
import type { Registration } from "@/lib/registrations";
import { RegistrationsAdmin } from "./_components/RegistrationsAdmin";

export const dynamic = "force-dynamic";

export default async function AcademyRegistrationsAdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!canManageRegistrations(session.role, "academy")) redirect(adminHomePath(session.role));

  let registrations: Registration[] = [];
  try {
    registrations = await listRegistrations();
  } catch (error) {
    console.error("[admin/registration/academy] could not load registrations", error);
  }

  return <RegistrationsAdmin registrations={registrations} />;
}
