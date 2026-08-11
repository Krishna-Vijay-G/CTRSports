/**
 * Deployment constants — the things that are true of the installation rather
 * than of the page.
 *
 * Everything a person would want to reword now lives in the database and is
 * edited at /admin/landing (copy and photography) or /admin/sports (the cards).
 * What is left here is what a content editor has no business changing: the
 * canonical URL the sitemap and Open Graph tags are built from, plus the search
 * metadata.
 *
 * See src/lib/landingContent.ts for the editable document and its defaults.
 */

/**
 * The public origin, e.g. https://example.com — no trailing slash.
 *
 * From the environment, never from the source: the domain is a property of the
 * deployment, and a repository that names it has to be edited to be moved. Every
 * canonical URL, the sitemap, the Open Graph tags and the JSON-LD are built from
 * this one value.
 *
 * Falls back to the local dev origin, which is right for `npm run dev` and wrong
 * everywhere else — so set SITE_URL in production. It is read at build time for
 * statically rendered metadata, so set it before `next build`, not only at run
 * time.
 */
const url = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

export const SITE = {
  url,
  name: "CTR Unified",
  locale: "en_IN",
} as const;

/**
 * Search and social metadata. Deliberately NOT in the database: it is read once
 * when the route's metadata is generated, so editing it in the admin would not
 * reliably take effect until the next deploy — which would be more confusing
 * than it plainly being a code change.
 */
export const SEO = {
  title: "CTR Unified — One Nation. One Championship.",
  description:
    "CTR Unified is a multi-sport organization bringing athletes, teams, and sporting communities together under one platform — from cricket and volleyball to Formula 4 racing and emerging sports.",
  keywords: [
    "CTR Unified",
    "CTR Sports",
    "Chennai Turbo Riders",
    "multi-sport organization",
    "Formula 4",
    "cricket",
    "volleyball",
    "field hockey",
    "pickleball",
    "motorsport India",
  ],
  /** Favicon and JSON-LD logo — needed before any database read happens. */
  logo: "/images/brand/ctr-logo.webp",
} as const;
