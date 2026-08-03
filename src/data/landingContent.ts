import seed from "../../landing_content.json";

/**
 * The landing page's copy, images and links.
 *
 * The LIVE content lives in the `site_content` table and is edited at
 * /media/admin/content. What lives here is the TYPE plus the DEFAULTS, which:
 *
 *   1. render the page when the database is unreachable or has no row yet, so
 *      it can never come up blank
 *   2. are the base every stored field is merged over, so a partial or
 *      malformed document degrades field by field rather than breaking
 *   3. seed the table via `npm run import-content`
 *
 * The defaults are read from landing_content.json at the project root rather
 * than written out again here, so the file the import script pushes and the
 * fallback the app renders can never drift apart.
 */

export type Sport = {
  id: string;
  name: string;
  team_name: string;
  description: string;
  website_url: string;
  logo_image: string;
  visit_label: string;
};

export const SOCIAL_ICONS = ["instagram", "facebook", "twitter", "youtube", "website"] as const;

export type SocialIconName = (typeof SOCIAL_ICONS)[number];

export type SocialLink = {
  label: string;
  href: string;
  icon: SocialIconName;
};

export type LandingContent = {
  splash: {
    title: string;
    aria_label: string;
    logo_image: string;
    fade_in_ms: number;
    hide_ms: number;
  };
  brand: {
    name: string;
    subtitle: string;
    logo_image: string;
    home_aria_label: string;
  };
  hero: {
    kicker: string;
    title: string;
    subtitle: string;
    about_title: string;
    about_body: string;
    background_image: string;
    cta_label: string;
  };
  sports_section: {
    kicker: string;
    title: string;
  };
  sports: Sport[];
  socials: SocialLink[];
};

/**
 * TypeScript infers only loose types from a JSON import (`icon` comes back as
 * `string`, not the union), so the shape is asserted once here. Everything
 * downstream is checked against LandingContent, and normaliseLandingContent
 * repairs the values at runtime — including anything wrong in this file.
 */
export const DEFAULT_LANDING_CONTENT = seed as LandingContent;
