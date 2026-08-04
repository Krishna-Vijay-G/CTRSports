import { SportPostsPage } from "@/components/sport/SportPostsPage";
import { loadPosts, sportPostMetadata } from "@/lib/server/sportPages";
import { SPORTS } from "@/lib/sports";

/** Re-rendered every minute; publishing from the admin also revalidates this path. */
export const revalidate = 60;

export const metadata = sportPostMetadata("academy");

export default async function Page() {
  return (
    <SportPostsPage
      sport={SPORTS.academy}
      posts={await loadPosts("academy")}
      year={new Date().getFullYear()}
    />
  );
}
