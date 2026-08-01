import { LandingPage } from "@/components/landing/LandingPage";
import { listPublishedPosts, type MediaPost } from "@/lib/posts";

/** Re-rendered every minute; publishing from the admin also revalidates this path. */
export const revalidate = 60;

async function loadPosts(): Promise<MediaPost[]> {
  try {
    return await listPublishedPosts();
  } catch (error) {
    // A missing/unreachable database must never take the marketing site down.
    console.error("[landing] could not load posts", error);
    return [];
  }
}

export default async function Page() {
  const posts = await loadPosts();
  return <LandingPage posts={posts} year={new Date().getFullYear()} />;
}
