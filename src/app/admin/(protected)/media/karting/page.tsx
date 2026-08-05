import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { canManageMedia, adminHomePath } from "@/lib/adminRoles";
import { listAllPosts } from "@/lib/server/postsRepo";
import { loadMarquee } from "@/lib/server/sportPages";
import type { MediaPost } from "@/lib/posts";
import { SPORTS } from "@/lib/sports";
import { SportMediaAdmin } from "@/components/admin/SportMediaAdmin";

export const dynamic = "force-dynamic";

export default async function KartingMediaAdminPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  if (!canManageMedia(session.role, "karting")) redirect(adminHomePath(session.role));

  let posts: MediaPost[] = [];
  try {
    posts = await listAllPosts("karting");
  } catch (error) {
    console.error("[admin/media/karting] could not load posts", error);
  }

  const marqueeItems = await loadMarquee("karting");

  return (
    <SportMediaAdmin
      sport={SPORTS.karting}
      initialPosts={posts}
      initialMarqueeItems={marqueeItems}
      nowIso={new Date().toISOString()}
    />
  );
}
