/**
 * PLACEHOLDER PHOTOGRAPHY — every URL here is a stock photo hosted by Unsplash.
 *
 * These are only DEFAULTS now. The live values live in the database and are
 * edited at /admin/landing (page photography) and /admin/sports (per-sport
 * photo and crest). This file is what a fresh database is seeded with, and what
 * the admin's "Load defaults" restores.
 *
 * They are remote, so they are NOT covered by the immutable cache header in
 * next.config.js (that only covers /images) and they cost one extra connection
 * — which is why src/app/layout.tsx preconnects to the host. Once real
 * photography is uploaded through the admin, that preconnect can go.
 */

const UNSPLASH = "https://images.unsplash.com";

/** Unsplash serves a resized, re-encoded file per query string — ask for the size we draw. */
function photo(id: string, width: number, quality = 72): string {
  return `${UNSPLASH}/${id}?auto=format&fit=crop&w=${width}&q=${quality}`;
}

/**
 * The banner photographs, in the order the default banners use them.
 *
 * All three are bright enough to read as photographs rather than black panels,
 * with enough contrast left in the corners that white type still sits on them
 * once a banner template's gradients are applied. The first is also the fallback
 * for any banner whose photo is blank or unusable.
 */
export const BANNER_PHOTOS = [
  /** Full stadium under floodlights. */
  photo("photo-1522778119026-d647f0596c20", 1800, 76),
  /** Sprinters off the blocks. */
  photo("photo-1461896836934-ffe607ba8211", 1800, 76),
  /** Circuit racing at dusk. */
  photo("photo-1552519507-da3b142c6e3d", 1800, 76),
];

/** The two photos flanking the about copy. */
export const ABOUT_PHOTOS = [
  { src: photo("photo-1461896836934-ffe607ba8211", 800), label: "Track & Field" },
  { src: photo("photo-1517649763962-0c623066013b", 800), label: "Endurance" },
];

/**
 * The INCRC page's photography.
 *
 * Two kinds. The `artwork` group is the championship's OWN material — the
 * circuit render, the car line-up, the signing photographs, the grid portrait
 * and the two partner marks — which came across with the deck and lives in
 * /public/images/incrc. Everything else is stock, standing in until the
 * championship's own photography is uploaded through the admin.
 *
 * All of it is only a default: every one of these is an editable field.
 */
export const INCRC_PHOTOS = {
  /** The rotating panels at the top. Dark enough to hold white type. */
  banners: [
    photo("photo-1552519507-da3b142c6e3d", 1800, 76),
    photo("photo-1568605117036-5fe5e7bab0b7", 1800, 76),
    photo("photo-1583121274602-3e2820c69888", 1800, 76),
  ],
  /** One per venue card. */
  venues: [
    photo("photo-1541447271487-09612b3f49f7", 900),
    photo("photo-1502877338535-766e1452684a", 900),
    photo("photo-1533473359331-0135ef1b58bf", 900),
  ],
  /** One per post card. */
  posts: [
    photo("photo-1600661653561-629509216228", 900),
    photo("photo-1517994112540-009c47ea476b", 900),
    photo("photo-1503376780353-7e6692767b70", 900),
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

/** Seeded onto the matching sport row, then editable per sport in the admin. */
export const SPORT_PHOTOS = {
  pickleball: photo("photo-1626224583764-f87db24ac4ea", 800),
  volleyball: photo("photo-1612872087720-bb876e2e67d1", 800),
  cricket: photo("photo-1540747913346-19e32dc3e97e", 800),
  hockey: photo("photo-1580748141549-71748dbe0bdc", 800),
  formula4: photo("photo-1552519507-da3b142c6e3d", 800),
  nationalRacing: photo("photo-1568605117036-5fe5e7bab0b7", 800),
} as const;
