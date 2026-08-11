import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

/** One entry for now. Add a line here when a new public page lands. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
