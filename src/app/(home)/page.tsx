import { getLandingContentSafe } from "@/lib/server/siteContent";
import { loadPosts } from "@/lib/server/sportPages";
import { DEFAULT_SPORT } from "@/lib/sports";
import { LandingPage } from "./_components/LandingPage";

/** Re-rendered every minute; publishing from the admin also revalidates this path. */
export const revalidate = 60;

export default async function Page() {
  // Only posts tagged for the main site — each sport's own posts live on its page.
  const [content, posts] = await Promise.all([
    getLandingContentSafe(),
    loadPosts(DEFAULT_SPORT),
  ]);

  return <LandingPage content={content} posts={posts} year={new Date().getFullYear()} />;
}
