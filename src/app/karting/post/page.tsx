import { SportPostsPage } from "@/components/sport/SportPostsPage";
import { loadPosts, loadMarquee, sportPostMetadata } from "@/lib/server/sportPages";
import { SPORTS } from "@/lib/sports";

/** Re-rendered every minute; publishing from the admin also revalidates this path. */
export const revalidate = 60;

export const metadata = sportPostMetadata("karting");

export default async function Page() {
  return (
    <SportPostsPage
      sport={SPORTS.karting}
      posts={await loadPosts("karting")}
      marquee={await loadMarquee("karting")}
      year={new Date().getFullYear()}
    />
  );
}
