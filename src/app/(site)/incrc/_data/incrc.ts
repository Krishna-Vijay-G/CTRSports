/**
 * The Indian National Car Racing Championship, as content.
 *
 * Extracted from the older CTR site's biography deck — specifically the
 * `incrc` block of its "CTR National Grid" chapter, plus its registration
 * chapter. Everything there that is about CTR the team rather than the
 * championship is deliberately left behind: the origin story, the IRL and F4
 * results, the karting league, the academy, the club, the roadmap and the
 * associated teams all belong on a CTR page, not this one.
 *
 * This is a code module rather than a row in `ctr_content`, which is the one
 * place this project departs from "everything is editable". Making it editable
 * means an admin screen for rounds, venues, vision cards and signing photos —
 * a bigger job than the page itself. The shape below is deliberately a single
 * plain object so that moving it into the document later is a normalise
 * function and nothing else.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

export type Stat = { value: string; label: string };
export type VisionItem = { label: string; description: string };
export type Venue = { number: string; name: string; city: string };
export type Round = { round: string; dates: string; venue: string; city: string };
export type Shot = { image: string; alt: string };

/**
 * Where a driver actually enters. This site has no registration form of its
 * own — the form, its validation and its API live on the older CTR site — so
 * this points there. Change it in one place when a form lands here, or when the
 * entry moves to a different host entirely.
 */
export const REGISTER_HREF =
  "https://chennaiturboriders.in/IndianNationalCarRacingChampionship/registration";

export const INCRC = {
  /* ── Identity ── */
  name: "Indian National Car Racing Championship",
  short: "INCRC",
  tagline: "One Nation · One Championship",
  handle: "@incrc_",
  instagram: "https://www.instagram.com/incrc_",

  /* ── The championship in one line ── */
  headline: "India's biggest multi-category national car racing championship",
  season: "The 2026 Season",
  seasonKicker: "FMSCI Indian National Car Racing Championship",

  /**
   * The three names on the championship. CTR's mark is the one already on this
   * site; the other two came across with the rest of the artwork.
   */
  partners: [
    { name: "Chennai Turbo Riders", logo: "/images/brand/ctr-logo.webp" },
    { name: "JK Tyre", logo: "/images/incrc/jktyre.webp" },
    { name: "FMSCI", logo: "/images/incrc/fmsci.webp" },
  ],

  intro: [
    "A national motorsport ecosystem uniting seven racing categories under one championship.",
    "A complete experience — racing, live audiences, fan ecosystems, entertainment, OTT broadcast and sponsorship integration.",
    "CTR is not organizing the future — CTR is building it.",
  ],

  stats: [
    { value: "7", label: "Racing categories" },
    { value: "4", label: "Championship rounds" },
    { value: "3", label: "Iconic circuits" },
    { value: "2026", label: "Inaugural season" },
  ] satisfies Stat[],

  /* ── Why it exists ── */
  vision: [
    {
      label: "Elevate Indian motorsport",
      description:
        "Raise the standard of competitive racing across all categories on India's finest circuits.",
    },
    {
      label: "Inspire the next generation",
      description:
        "Nurture and develop the next wave of Indian racing champions from grassroots to national level.",
    },
    {
      label: "Build a world-class racing ecosystem",
      description:
        "Create a self-sustaining motorsport infrastructure with safety, broadcast and fan engagement at its core.",
    },
    {
      label: "Position India as a global destination",
      description:
        "Establish India as a premier motorsport destination, attracting international talent and investment.",
    },
  ] satisfies VisionItem[],

  /* ── One grid for the whole country ── */
  grid: {
    heading: "A single grid for the whole country.",
    body: "Seven racing categories — from Formula 4 to saloons, hatchbacks and touring cars — line up together under one national banner, on India's finest circuits.",
    circuitImage: "/images/incrc/one-nation.webp",
    circuitAlt:
      "One Nation, One Championship — 3D render of the Kari Motor Speedway circuit, presented by CTR, JK Tyre and FMSCI.",
    circuitCaption: "Kari Motor Speedway · Coimbatore",
    carsImage: "/images/incrc/cars-lineup.webp",
    carsAlt:
      "The multi-category grid — Formula 4, saloon, hatchback and touring cars in CTR and JK Tyre livery.",
  },

  /* ── Where it races ── */
  venues: [
    { number: "01", name: "Kari Motor Speedway", city: "Coimbatore" },
    { number: "02", name: "Bren Raceway", city: "Bengaluru" },
    { number: "03", name: "Madras International Circuit", city: "Chennai" },
  ] satisfies Venue[],

  /* ── When it races ── */
  rounds: [
    {
      round: "01",
      dates: "11–13 September 2026",
      venue: "Kari Motor Speedway",
      city: "Coimbatore",
    },
    {
      round: "02",
      dates: "23–25 October 2026",
      venue: "Kari Motor Speedway",
      city: "Coimbatore",
    },
    { round: "03", dates: "13–15 November 2026", venue: "Bren Raceway", city: "Bengaluru" },
    {
      round: "04",
      dates: "11–13 December 2026",
      venue: "Madras International Circuit",
      city: "Chennai",
    },
  ] satisfies Round[],

  /* ── How it came about ── */
  partnership: {
    kicker: "Behind the grid",
    title: "A landmark partnership",
    text: "CTR, JK Tyre and FMSCI put pen to paper — bringing India's biggest multi-category national car racing championship to life.",
    shots: [
      {
        image: "/images/incrc/signing-1.webp",
        alt: "CTR, JK Tyre and FMSCI officials signing the championship agreement.",
      },
      {
        image: "/images/incrc/signing-2.webp",
        alt: "CTR and JK Tyre representatives sealing the partnership with a handshake.",
      },
      {
        image: "/images/incrc/signing-3.webp",
        alt: "The CTR, JK Tyre and FMSCI leadership with the signed championship agreement.",
      },
    ] satisfies Shot[],
  },

  /* ── Who makes it happen ── */
  family: {
    image: "/images/incrc/family.webp",
    alt: "Media, teams, marshals and officials standing arm-in-arm on the grid at sunset.",
    lead: "Entertainment isn't created by one organiser.",
    quote: "It is powered by an entire motorsport family.",
  },

  /* ── How to enter ── */
  registration: {
    kicker: "2026 season · registration open",
    title: "Race with CTR",
    // The source deck said "Eight categories" here while the championship's own
    // figures say seven, in two separate places. Seven is the number used.
    lead: "Seven categories. Four national rounds on India's best circuits. Whether it is your first race or your next championship, there is a grid here for you.",
    ctaLabel: "Register now",
  },
} as const;
