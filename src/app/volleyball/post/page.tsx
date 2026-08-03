import type { Metadata } from "next";
import { SportPostsPage } from "@/components/sport/SportPostsPage";
import { listPublishedPosts, type MediaPost } from "@/lib/posts";
import { SPORTS } from "@/lib/sports";

const sport = SPORTS.volleyball;

/** Re-rendered every minute; publishing from the admin also revalidates this path. */
export const revalidate = 60;

export const metadata: Metadata = {
  title: `${sport.name} — ${sport.team} | CTR Unified`,
  description: sport.tagline,
};

async function loadPosts(): Promise<MediaPost[]> {
  try {
    return await listPublishedPosts(sport.id);
  } catch (error) {
    // A missing/unreachable database must never take the page down.
    console.error("[volleyball] could not load posts", error);
    return [];
  }
}

export default async function Page() {
  const posts = await loadPosts();
  return <SportPostsPage sport={sport} posts={posts} year={new Date().getFullYear()} />;
}
