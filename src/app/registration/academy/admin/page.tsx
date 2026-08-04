import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { listRegistrations } from "@/lib/server/registrationsRepo";
import type { Registration } from "@/lib/registrations";
import { RegistrationsAdmin } from "./_components/RegistrationsAdmin";

export const metadata: Metadata = {
  title: "Race Registrations · CTR Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function RegistrationsAdminPage() {
  const session = await getSession();
  if (!session) {
    redirect("/media/admin/login");
  }

  let registrations: Registration[] = [];
  try {
    registrations = await listRegistrations();
  } catch (error) {
    console.error("[registration/academy/admin] could not load registrations", error);
  }

  return (
    <div className="min-h-screen bg-carbon-950 font-body text-white/90">
      <RegistrationsAdmin registrations={registrations} username={session.username} />
    </div>
  );
}
