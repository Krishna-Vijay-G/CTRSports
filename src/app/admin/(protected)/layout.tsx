import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "CTR Admin",
  robots: { index: false, follow: false },
};

/**
 * Every `/admin/*` screen except login. One session check gates the whole
 * tree; each page underneath still checks its own permission (can this
 * specific role reach this specific sport/section) since being signed in
 * and being authorized for a page are different questions.
 */
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminShell username={session.username} role={session.role}>
      {children}
    </AdminShell>
  );
}
