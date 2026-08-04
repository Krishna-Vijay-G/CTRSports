import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import type { MediaPost } from "@/lib/posts";
import { listAllPosts } from "@/lib/server/postsRepo";
import { AdminDashboard } from "./_components/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session) {
    redirect("/media/admin/login");
  }

  let posts: MediaPost[] = [];
  try {
    posts = await listAllPosts();
  } catch (error) {
    console.error("[admin] could not load posts", error);
  }

  return (
    <AdminDashboard
      initialPosts={posts}
      username={session.username}
      nowIso={new Date().toISOString()}
    />
  );
}
