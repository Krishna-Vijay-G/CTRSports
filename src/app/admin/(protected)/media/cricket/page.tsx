import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { canManageMedia, adminHomePath } from "@/lib/adminRoles";
import { listAllPosts } from "@/lib/server/postsRepo";
import { loadMarquee } from "@/lib/server/sportPages";
import type { MediaPost } from "@/lib/posts";
import { SPORTS } from "@/lib/sports";
import { SportMediaAdmin } from "@/components/admin/SportMediaAdmin";

export const dynamic = "force-dynamic";

export default async function CricketMediaAdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!canManageMedia(session.role, "cricket")) redirect(adminHomePath(session.role));

  let posts: MediaPost[] = [];
  try {
    posts = await listAllPosts("cricket");
  } catch (error) {
    console.error("[admin/media/cricket] could not load posts", error);
  }

  const marqueeItems = await loadMarquee("cricket");

  return (
    <SportMediaAdmin
      sport={SPORTS.cricket}
      initialPosts={posts}
      initialMarqueeItems={marqueeItems}
      nowIso={new Date().toISOString()}
    />
  );
}
