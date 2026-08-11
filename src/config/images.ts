/**
 * PLACEHOLDER PHOTOGRAPHY — every URL in this file is a stock photo hosted by
 * Unsplash, standing in until the real CTR shoot is uploaded to S3.
 *
 * To swap one out, replace the URL with the S3 URL. Nothing else has to change:
 * every consumer takes a plain string and renders it in an <img>.
 *
 * They are remote, so they are NOT covered by the immutable cache header in
 * next.config.js (that only applies to /images) and they cost one extra
 * connection — which is why src/app/layout.tsx preconnects to the host. Once
 * these move to S3 under our own domain, that preconnect should follow.
 *
 * Sport logos are a separate thing: those come from the database and are
 * managed in /admin. This file is only the photography behind them.
 */

const UNSPLASH = "https://images.unsplash.com";

/** Unsplash serves a resized, re-encoded file per query string — ask for the size we draw. */
function photo(id: string, width: number, quality = 72): string {
  return `${UNSPLASH}/${id}?auto=format&fit=crop&w=${width}&q=${quality}`;
}

/**
 * Full stadium under floodlights. Bright enough to read as a photograph rather
 * than a black panel, with enough contrast left in the corners that the white
 * headline still sits on it once the gradients in Hero.tsx are applied.
 */
export const HERO_PHOTO = photo("photo-1522778119026-d647f0596c20", 1800, 76);

/** The two photos flanking the about copy. */
export const ABOUT_PHOTOS = [
  { src: photo("photo-1461896836934-ffe607ba8211", 800), label: "Track & Field" },
  { src: photo("photo-1517649763962-0c623066013b", 800), label: "Endurance" },
];

/**
 * One photo per sport card, chosen from the card's title.
 *
 * Matched on the title rather than on the row's position in the list: position
 * changes every time someone drags the list in /admin, which would silently put
 * a racing car on the cricket card. The title is the thing that actually
 * describes the sport, so it is what picks the picture.
 *
 * First match wins, so the more specific patterns come first — "Formula 4
 * Racing" has to be caught by `formula` before the generic racing rule sees it.
 */
const SPORT_PHOTOS: { match: RegExp; src: string }[] = [
  { match: /pickle|padel|tennis|badminton|squash/i, src: photo("photo-1626224583764-f87db24ac4ea", 800) },
  { match: /volley/i, src: photo("photo-1612872087720-bb876e2e67d1", 800) },
  { match: /cricket/i, src: photo("photo-1540747913346-19e32dc3e97e", 800) },
  { match: /hockey/i, src: photo("photo-1580748141549-71748dbe0bdc", 800) },
  { match: /formula|karting|kart\b|f4/i, src: photo("photo-1552519507-da3b142c6e3d", 800) },
  { match: /rac(e|ing)|motor|circuit|championship/i, src: photo("photo-1568605117036-5fe5e7bab0b7", 800) },
];

/** A sport nobody wrote a rule for still gets a picture rather than a gap. */
const FALLBACK_PHOTOS = SPORT_PHOTOS.map((entry) => entry.src);

export function sportPhoto(title: string, index: number): string {
  const matched = SPORT_PHOTOS.find((entry) => entry.match.test(title));
  return matched ? matched.src : FALLBACK_PHOTOS[index % FALLBACK_PHOTOS.length];
}
