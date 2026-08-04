import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { canManageMedia, adminHomePath } from "@/lib/adminRoles";
import { listAllPosts } from "@/lib/server/postsRepo";
import { loadMarquee } from "@/lib/server/sportPages";
import type { MediaPost } from "@/lib/posts";
import { SPORTS } from "@/lib/sports";
import { SportMediaAdmin } from "@/components/admin/SportMediaAdmin";

export const dynamic = "force-dynamic";

export default async function VolleyballMediaAdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!canManageMedia(session.role, "volleyball")) redirect(adminHomePath(session.role));

  let posts: MediaPost[] = [];
  try {
    posts = await listAllPosts("volleyball");
  } catch (error) {
    console.error("[admin/media/volleyball] could not load posts", error);
  }

  const marqueeItems = await loadMarquee("volleyball");

  return (
    <SportMediaAdmin
      sport={SPORTS.volleyball}
      initialPosts={posts}
      initialMarqueeItems={marqueeItems}
      nowIso={new Date().toISOString()}
    />
  );
}
