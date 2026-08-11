import type { MetadataRoute } from "next";
import { SITE } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Not a security control — the layout does that. This just keeps the
      // login page out of search results.
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
