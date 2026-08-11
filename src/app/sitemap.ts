import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

/** Add a line here when a new public page lands. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE.url}/incrc`,
      lastModified: new Date(),
      // The championship's dates and venues are set for the season; only the
      // round results would move, and those are not on this page yet.
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
