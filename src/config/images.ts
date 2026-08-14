/**
 * The photography the pages fall back to.
 *
 * These are only DEFAULTS. The live values are in the `ctr.content` row for each
 * page and are edited at /console/landing and /console/incrc; this file is what
 * renders when there is no row yet, when the database is unreachable
 * (`getLandingContentSafe` / `getIncrcContentSafe`), and per-field when a stored
 * document is missing one.
 *
 * That last case is why these were pulled from the live documents rather than
 * left as the stock photographs they started as. A fallback that does not look
 * like the site is a fallback that looks like a fault: an outage used to put
 * Unsplash stadium stock on the front page, and one missing field in an
 * otherwise good document used to put a stock sprinter between two real ones.
 *
 * FOUR hosts appear below, and the difference matters when one of them moves:
 *
 *   /images/…    in this repo, under /public. Covered by the immutable cache
 *                header in next.config.js. Nothing to go wrong.
 *   media.ctrsports.in  uploaded through the admin's own media library, served
 *                through CloudFront. Not written down here: the host comes from
 *                MEDIA_BASE_URL (src/config/media.ts), which is the only place
 *                that decides it. As permanent as the bucket behind it.
 *   raw.githubusercontent.com/…/asset-temp  a separate repository holding
 *                artwork that has not been through the media library. Live uses
 *                these today, so they are what a fallback has to match.
 *   www.evoindia.com  exactly one photograph — ABOUT_PHOTOS[0], the touring-car
 *                shot. Somebody else's server, and the one URL here that nothing
 *                we run can keep alive. Re-hosting it through the media library
 *                would put it on the line above and end the exception; until
 *                then it is named so nobody assumes the media-domain work
 *                touched it. It did not, and could not: not S3, not our prefix.
 *
 * The site draws all of these with plain <img>, so nothing here needs a
 * next.config entry — only the preconnect in src/app/layout.tsx, which points at
 * whichever host the first paint needs. That is the media host and the artwork
 * repository; the evoindia photograph is below the fold, where a preconnect
 * would spend a connection to save nothing.
 */

import { MEDIA_BASE_URL, MEDIA_KEY_PREFIX } from "@/config/media";

/** Artwork kept beside the code rather than in the bucket. */
const ASSETS = "https://raw.githubusercontent.com/Krishna-Vijay-G/asset-temp/refs/heads/main";

/** Uploaded through the admin. The prefix the media library writes under. */
const MEDIA = `${MEDIA_BASE_URL}/${MEDIA_KEY_PREFIX}`;

/**
 * The landing page's banner photographs, in the order its banners use them.
 *
 * The first is also the fallback for ANY banner whose image is blank or
 * unusable — see `normaliseBanners` — so it has to be one that reads on its own
 * with no title over it, which is what the live first banner is.
 */
export const BANNER_PHOTOS = [
  /** The championship banner artwork. */
  `${ASSETS}/banner1.jpeg`,
  /** The CTR Unified wordmark, drawn whole rather than cropped — `fit: "fit"`. */
  `${ASSETS}/CTR%20UNIFIED%20(Medium).png`,
  /** Circuit action. */
  `${ASSETS}/DSC_0528%7E2%20(Medium).jpeg`,
];

/** The two photos flanking the about copy. Their labels are content, so they live here too. */
export const ABOUT_PHOTOS = [
  {
    src: "https://www.evoindia.com/evoindia/2024-02/1dc1ca47-79c5-49e0-b10c-3bfb59652723/Deepak_Ravikumar__winner_of_the_Touring_Cars_Race_1__July_22_.jpg",
    label: "Track & Field",
  },
  { src: `${MEDIA}/bdfa54cd-ce60-4347-940d-85b2a84b534c.webp`, label: "Endurance" },
];

/**
 * The INCRC page's photography.
 *
 * `artwork` is the championship's OWN material — the circuit render, the car
 * line-up, the signing photographs and the three partner marks — which came
 * across with the deck and lives in /public/images/incrc. The banners and the
 * newsroom photographs are the live ones: five and three respectively, which is
 * what the page actually shows.
 */
export const INCRC_PHOTOS = {
  /** The rotating panels at the top. Five, matching the live document. */
  banners: [
    `${ASSETS}/banner1.jpeg`,
    "/images/incrc/signing-2.webp",
    `${ASSETS}/DR%20(Medium).png`,
    `${ASSETS}/chairman%20JK%20TYRES%20(Medium).png`,
    `${ASSETS}/MAKAPA%20(Medium).png`,
  ],
  /** One per newsroom card, uploaded through the media library. */
  posts: [
    `${MEDIA}/37d7578e-1b72-4c6e-b326-863b2bb2b3b1.webp`,
    `${MEDIA}/e7722247-977f-48af-a641-7dd04d021b7a.webp`,
    `${MEDIA}/62a1551c-34a4-46d3-a675-2cef692a0789.webp`,
  ],
  artwork: {
    circuit: "/images/incrc/one-nation.webp",
    cars: "/images/incrc/cars-lineup.webp",
    family: "/images/incrc/family.webp",
    signing: [
      "/images/incrc/signing-1.webp",
      "/images/incrc/signing-2.webp",
      "/images/incrc/signing-3.webp",
    ],
    ctr: "/images/brand/ctr-logo.webp",
    jkTyre: "/images/incrc/jktyre.webp",
    fmsci: "/images/incrc/fmsci.webp",
  },
} as const;
