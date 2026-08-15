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
 * NOTHING HERE IS SERVED FROM THE MEDIA BUCKET, and that is the point.
 *
 * These four used to be uploads — `${MEDIA_BASE_URL}/…/<uuid>.webp`. They are
 * repo files now, because a fallback that depends on the bucket is a fallback
 * that fails in exactly the situation it exists for. An S3 outage, a bucket
 * renamed, a policy that stopped being public: every one of those is a moment
 * when the defaults are what is rendering, and every one of them takes the
 * bucket with it. A file under /public is served by the same deployment that is
 * already answering the request.
 *
 * It also means these cannot rot. When the bucket changed name and prefix, four
 * URLs here silently pointed at nothing; a path under /public cannot do that
 * without the build noticing.
 *
 * Three hosts remain, and the difference matters when one of them moves:
 *
 *   /images/…    in this repo, under /public. Covered by the immutable cache
 *                header in next.config.js. Nothing to go wrong.
 *   raw.githubusercontent.com/…/asset-temp  a separate repository holding
 *                banner artwork that has not been through the media library.
 *                Live uses these today, so they are what a fallback has to
 *                match — and they are the one remaining external dependency in
 *                the defaults worth removing next.
 *   www.evoindia.com  exactly one photograph — ABOUT_PHOTOS[0], the touring-car
 *                shot. Somebody else's server, and the one URL here that nothing
 *                we run can keep alive.
 *
 * The site draws all of these with plain <img>, so nothing here needs a
 * next.config entry. The preconnect in src/app/layout.tsx still points at the
 * media host, which is correct: no DEFAULT is served from there, but every
 * uploaded banner is, and that is the first paint once real content is saved.
 */

/** Artwork kept beside the code rather than in the bucket. */
const ASSETS = "https://raw.githubusercontent.com/Krishna-Vijay-G/asset-temp/refs/heads/main";

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
  { src: "/images/hero/background.webp", label: "Endurance" },
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
  /**
   * One per newsroom card.
   *
   * The championship's own artwork rather than three uploads, for the reason at
   * the top of this file. They double as the `artwork` entries below, which is
   * fine: a default only renders until somebody writes a real post, and a
   * picture the site already uses beats a broken one.
   */
  posts: [
    "/images/incrc/cars-lineup.webp",
    "/images/incrc/one-nation.webp",
    "/images/incrc/signing-1.webp",
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
