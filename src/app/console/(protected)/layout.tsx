import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { AdminShell } from "@/admin/components/AdminShell";

export const metadata: Metadata = {
  title: "CTR Admin",
  robots: { index: false, follow: false },
};

/**
 * Gates every /admin screen except the login page, which sits outside this
 * route group precisely so it is reachable while signed out.
 *
 * Signed in is the whole of what this asks. WHICH screens an account may open
 * is asked by each screen for itself, with `requirePage` and its siblings in
 * src/lib/server/access.ts — a layout cannot know which page is below it, and a
 * layout that tried would be a second place for the answer to live.
 *
 * What it does do is hand the role down to the navigation, so the sidebar lists
 * the screens this account can actually open. That is a courtesy, not the
 * enforcement: the screens and the routes refuse on their own.
 */
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    // A public path, not the mount point: the browser only ever sees the admin
    // host's own root, and the middleware maps that back to this tree.
    redirect("/login");
  }

  return (
    <AdminShell username={session.username} role={session.role} pages={session.pages}>
      {children}
    </AdminShell>
  );
}
