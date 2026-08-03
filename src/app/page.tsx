import { LandingPage } from "@/components/landing/LandingPage";
import { listPublishedPosts, type MediaPost } from "@/lib/posts";
import { getLandingContentSafe } from "@/lib/siteContent";
import { DEFAULT_SPORT } from "@/lib/sports";

/** Re-rendered every minute; publishing from the admin also revalidates this path. */
export const revalidate = 60;

/** Only posts tagged for the main site — each sport's own posts live on its page. */
async function loadPosts(): Promise<MediaPost[]> {
  try {
    return await listPublishedPosts(DEFAULT_SPORT);
  } catch (error) {
    // A missing/unreachable database must never take the marketing site down.
    console.error("[landing] could not load posts", error);
    return [];
  }
}

export default async function Page() {
  const [content, posts] = await Promise.all([getLandingContentSafe(), loadPosts()]);
  return <LandingPage content={content} posts={posts} year={new Date().getFullYear()} />;
}
