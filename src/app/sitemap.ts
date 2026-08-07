import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { BUILT_SPORT_PAGES, sportPostsPath } from "@/lib/sports";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/IndianNationalCarRacingChampionship`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/IndianNationalCarRacingChampionship/registration`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/academy`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/karting`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    // Derived, so a new sport page cannot be built and then left unindexed.
    ...BUILT_SPORT_PAGES.map((id) => ({
      url: `${SITE_URL}${sportPostsPath(id)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
