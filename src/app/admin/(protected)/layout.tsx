import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "CTR Admin",
  robots: { index: false, follow: false },
};

/**
 * Gates every /admin screen except the login page, which sits outside this
 * route group precisely so it is reachable while signed out.
 *
 * There are no roles: signed in means full access to everything under here.
 */
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  return <AdminShell username={session.username}>{children}</AdminShell>;
}
