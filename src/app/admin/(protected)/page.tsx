import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { adminHomePath } from "@/lib/adminRoles";

export const dynamic = "force-dynamic";

/** No dashboard of its own — straight to whichever screen this role reaches first. */
export default async function AdminIndexPage() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  redirect(adminHomePath(session.role));
}
