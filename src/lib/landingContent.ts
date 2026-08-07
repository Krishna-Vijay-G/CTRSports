/**
 * The landing page's copy, images and links.
 *
 * The LIVE content lives in the `site_content` table and is edited at
 * /admin/content. What lives here is the TYPE plus the DEFAULTS, which:
 *
 *   1. render the page when the database is unreachable or has no row yet, so
 *      it can never come up blank
 *   2. are the base every stored field is merged over, so a partial or
 *      malformed document degrades field by field rather than breaking
 *   3. are what the admin's "Load defaults" button restores
 *
 * A fresh database needs no seeding: with no row, the page renders these and
 * the editor opens on them — saving once writes the row.
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

export const DEFAULT_LANDING_CONTENT: LandingContent = {
  splash: {
    title: "CTR UNIFIED",
    aria_label: "Loading CTR Unified",
    logo_image: "/media/ctr-logo.png",
    fade_in_ms: 1300,
    hide_ms: 2000,
  },
  brand: {
    name: "CTR UNIFIED",
    subtitle: "SPORTS COLLECTIVE",
    logo_image: "/media/ctr-logo.png",
    home_aria_label: "CTR Unified home",
  },
  hero: {
    kicker: "CTR SPORTS COLLECTIVE",
    title: "CTR UNIFIED",
    subtitle: "One Team. Multiple Sports.\nUnlimited Possibilities.",
    about_title: "One Unified Platform",
    about_body:
      "CTR Unified is a multi-sport organization that brings together athletes, teams, and sporting communities under one unified platform. From cricket and volleyball to Formula 4 racing and emerging sports, CTR Unified promotes excellence, teamwork, innovation, and competitive spirit across all disciplines.",
    background_image: "/media/background.jpeg",
    cta_label: "Explore Sports",
  },
  sports_section: {
    kicker: "SPORTS IN CTR UNIFIED",
    title: "Unified Sports Programs",
  },
  sports: [
    {
      id: "sport-pickleball",
      name: "Pickleball",
      team_name: "Chennai Super Warriors",
      description:
        "Explosive hand-speed, compact court strategy, and doubles chemistry define CTR's pickleball identity.",
      website_url: "https://ipblofficial.com/team/chennai-super-warriors/",
      logo_image: "/media/pickle.png",
      visit_label: "Visit",
    },
    {
      id: "sport-volleyball",
      name: "Volleyball",
      team_name: "Kasi Warriors",
      description:
        "Vertical athleticism and controlled transition play power our volleyball program across elite competitions.",
      website_url: "/volleyball/post",
      logo_image: "/media/volley.png",
      visit_label: "View Posts",
    },
    {
      id: "sport-cricket",
      name: "Cricket",
      team_name: "Accord Warriors",
      description:
        "Structured batting depth, precision bowling plans, and relentless fielding standards anchor this unit.",
      website_url: "/cricket/post",
      logo_image: "/media/cricket.png",
      visit_label: "View Posts",
    },
    {
      id: "sport-hockey",
      name: "Field Hockey",
      team_name: "Accord Tamil Nadu Dragons",
      description:
        "Pace-driven pressing and disciplined circle execution make our hockey program sharp and competitive.",
      website_url: "https://www.tamilnadudragons.in",
      logo_image: "/media/hockey.png",
      visit_label: "Visit",
    },
    {
      id: "sport-f4",
      name: "Formula 4 Racing",
      team_name: "CTR Racing Development",
      description:
        "From telemetry to racecraft, the F4 pathway develops next-generation circuit talent with measurable rigor.",
      website_url: "https://www.chennaiturboriders.in",
      logo_image: "/media/ctr-f4-championship.png",
      visit_label: "Visit",
    },
    {
      id: "sport-academy",
      name: "CTR Academy",
      team_name: "Performance & Motorsport Division",
      description:
        "Academy programs blend motorsport science, athlete conditioning, and team discipline into one track-ready system.",
      website_url: "/academy",
      logo_image: "/media/ctr-logo.png",
      visit_label: "Explore",
    },
    {
      id: "sport-karting",
      name: "CTR Karting League",
      team_name: "Grassroots Racing Series",
      description:
        "The karting league identifies young drivers early and builds race intelligence through structured progression.",
      website_url: "/karting",
      logo_image: "/media/ctr-logo.png",
      visit_label: "View Posts",
    },
    {
      id: "sport-national-racing",
      name: "Indian National Car Racing Championship",
      team_name: "National Circuit Program",
      description:
        "A professional national ladder connecting karting graduates to full circuit competition under one unified banner.",
      website_url: "/IndianNationalCarRacingChampionship",
      logo_image: "/media/ctr-national-racing.png",
      visit_label: "Visit",
    },
  ],
  socials: [
    { label: "Instagram", href: "https://www.instagram.com/incrc_", icon: "instagram" },
    { label: "Facebook", href: "https://www.facebook.com/chennaiturboriders", icon: "facebook" },
    { label: "Twitter", href: "https://twitter.com/chennaiturbo", icon: "twitter" },
    { label: "YouTube", href: "https://www.youtube.com/@chennaiturboriders", icon: "youtube" },
  ],
};
