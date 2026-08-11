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
 * Full stadium under floodlights. Bright enough to read as a photograph rather
 * than a black panel, with enough contrast left in the corners that the white
 * headline still sits on it once the hero's gradients are applied.
 */
export const HERO_PHOTO = photo("photo-1522778119026-d647f0596c20", 1800, 76);

/** The two photos flanking the about copy. */
export const ABOUT_PHOTOS = [
  { src: photo("photo-1461896836934-ffe607ba8211", 800), label: "Track & Field" },
  { src: photo("photo-1517649763962-0c623066013b", 800), label: "Endurance" },
];

/** Seeded onto the matching sport row, then editable per sport in the admin. */
export const SPORT_PHOTOS = {
  pickleball: photo("photo-1626224583764-f87db24ac4ea", 800),
  volleyball: photo("photo-1612872087720-bb876e2e67d1", 800),
  cricket: photo("photo-1540747913346-19e32dc3e97e", 800),
  hockey: photo("photo-1580748141549-71748dbe0bdc", 800),
  formula4: photo("photo-1552519507-da3b142c6e3d", 800),
  nationalRacing: photo("photo-1568605117036-5fe5e7bab0b7", 800),
} as const;
