/**
 * The three things the media grid has to render about a file, in one place so
 * the picker and the library cannot disagree about how a kilobyte is spelled.
 */

/** Whole kilobytes below a megabyte, one decimal above. Nobody needs bytes. */
export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

/**
 * "12 Mar 2026". Locale-independent by construction.
 *
 * `toLocaleDateString` with no locale renders differently on the server and in
 * the browser, which is a hydration mismatch waiting for the first admin outside
 * the server's timezone. The parts are assembled by hand instead.
 */
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function formatDate(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";

  return `${at.getUTCDate()} ${MONTHS[at.getUTCMonth()]} ${at.getUTCFullYear()}`;
}

/** The bit after the last dot, uppercased, for the tile that has no thumbnail. */
export function extensionOf(key: string): string {
  const name = key.slice(key.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "FILE" : name.slice(dot + 1).toUpperCase().slice(0, 4);
}

/** The filename, without the folders above it. */
export function nameOfKey(key: string): string {
  return key.slice(key.lastIndexOf("/") + 1);
}

/**
 * What the grid draws a thumbnail for.
 *
 * Everything this project uploads today is one of these — the upload route's
 * MIME whitelist sees to that — so the fallback exists for an object put in the
 * bucket by hand, not for a path the admin can reach.
 */
const IMAGE_EXTENSIONS = new Set(["WEBP", "PNG", "JPG", "JPEG", "GIF", "SVG", "AVIF"]);

export function isImageKey(key: string): boolean {
  return IMAGE_EXTENSIONS.has(extensionOf(key));
}
