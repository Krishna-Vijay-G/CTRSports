/**
 * What a folder may be called, and what a media key may look like.
 *
 * Deliberately NOT `server-only`. The browser runs the same validator, so the
 * New folder dialog can explain a rejection as somebody types rather than after
 * a round trip — the same argument `src/lib/roles.ts` makes for being shared.
 * One rule in one place is also the only way the client and the server cannot
 * disagree about what is allowed.
 *
 * ── On traversal, precisely ───────────────────────────────────────────────
 *
 * S3 does not normalise `..`. `a/../b` is a literal object name, not `b`, so
 * there is no filesystem to escape from and no directory to climb out of. The
 * real risk is narrower and worse: naming a key under a DIFFERENT prefix.
 * `ENTRY_PREFIX` (`ctr-unified/entries/`) holds licence scans and passport
 * photographs, and it is a SIBLING of `MEDIA_PREFIX` (`ctr-unified/media/`),
 * not a child. So `startsWith(MEDIA_PREFIX)` is the whole defence, and no key
 * that passes `isMediaKey` can reach a registration attachment.
 *
 * Rejecting `%` matters for the same reason: it means no percent-decode
 * anywhere later in the stack can turn a stored name back into `..` or `/`.
 */

/** The prefix everything this project uploads lives under. */
const MEDIA_PREFIX = "ctr-unified/media/";

/**
 * Four levels, and the depth is what makes folder delete bounded: creating one
 * is at most four puts, and nothing can build a tree deep enough to be slow to
 * walk.
 */
export const MAX_FOLDER_DEPTH = 4;

/** Long enough for "2025 season launch", short enough to read in a breadcrumb. */
export const MAX_SEGMENT = 48;

/** Where a tile upload goes when nobody chose. */
export const DEFAULT_UPLOAD_FOLDER = "uploads";

/** Where a deck's bulk upload goes — fifty pages in the root is the mess this prevents. */
export const DECK_UPLOAD_FOLDER = "decks";

/**
 * Names that would be confusing, dangerous or both.
 *
 * `entries` because a folder of that name under media reads exactly like the
 * private attachment prefix and is not it; `media` because
 * `ctr-unified/media/media/…` is nobody's intention. The rest are Windows
 * device names, which are not a problem for S3 and are a problem for anyone who
 * ever syncs the bucket to a disk.
 */
const RESERVED = new Set(["entries", "media", "con", "prn", "aux", "nul"]);

/**
 * Letters and digits at both ends, letters, digits, spaces, hyphens and
 * underscores in between.
 *
 * What it excludes is the point, and it excludes by construction rather than by
 * a list of banned things: `/`, `\`, `.`, `%`, control characters, everything
 * non-ASCII, and the names `.` and `..`.
 */
const SEGMENT = /^[A-Za-z0-9](?:[A-Za-z0-9 _-]*[A-Za-z0-9_-])?$/;

/**
 * One folder name, REBUILT rather than returned.
 *
 * The value that comes back is assembled here from what passed the test — it is
 * never the caller's string handed back. A validator that returns its input is
 * one refactor away from returning something that never went through the test
 * at all.
 *
 * Null means no. The routes turn that into a sentence per rule, because a
 * single "Invalid name." for six different rules is how somebody ends up typing
 * at a dialog until they give up.
 */
export function parseSegment(raw: unknown): string | null {
  if (typeof raw !== "string") return null;

  // Collapse runs of spaces first, so "a  b" and "a b" cannot become two
  // folders that look identical in a breadcrumb.
  const name = raw.trim().replace(/ {2,}/g, " ");

  if (name.length < 1 || name.length > MAX_SEGMENT) return null;
  if (!SEGMENT.test(name)) return null;
  if (RESERVED.has(name.toLowerCase())) return null;

  return name;
}

/** Which rule a name broke, for the sentence the route sends back. */
export type SegmentProblem = "empty" | "long" | "charset" | "reserved";

export function segmentProblem(raw: unknown): SegmentProblem | null {
  if (typeof raw !== "string") return "empty";

  const name = raw.trim().replace(/ {2,}/g, " ");

  if (name.length < 1) return "empty";
  if (name.length > MAX_SEGMENT) return "long";
  if (!SEGMENT.test(name)) return "charset";
  if (RESERVED.has(name.toLowerCase())) return "reserved";

  return null;
}

/** The sentence for each, shared by the dialog and the route so they agree. */
export const SEGMENT_MESSAGES: Record<SegmentProblem, string> = {
  empty: "A folder needs a name.",
  long: `A folder name can be at most ${MAX_SEGMENT} characters.`,
  charset: "A folder name can only use letters, numbers, spaces, hyphens and underscores.",
  reserved: "That name is reserved.",
};

/**
 * A whole folder path. `""` is the root and is VALID — it is where every
 * existing upload already lives.
 *
 * Rebuilt segment by segment, so a path is only ever as trustworthy as each of
 * its parts.
 */
export function parseFolder(raw: unknown): string | null {
  if (raw === "" || raw === undefined || raw === null) return "";
  if (typeof raw !== "string") return null;

  const trimmed = raw.replace(/^\/+|\/+$/g, "");
  if (trimmed === "") return "";

  const parts = trimmed.split("/");
  if (parts.length > MAX_FOLDER_DEPTH) return null;

  const clean: string[] = [];
  for (const part of parts) {
    const segment = parseSegment(part);
    if (segment === null) return null;
    clean.push(segment);
  }

  return clean.join("/");
}

export function folderSegments(folder: string): string[] {
  return folder ? folder.split("/") : [];
}

/** "decks/2025" → "decks". The root's parent is the root. */
export function parentFolder(folder: string): string {
  const parts = folderSegments(folder);
  parts.pop();
  return parts.join("/");
}

/** A child of a folder, or null if either half — or the depth — fails. */
export function joinFolder(parent: string, name: string): string | null {
  const base = parseFolder(parent);
  const segment = parseSegment(name);

  if (base === null || segment === null) return null;

  const joined = base ? `${base}/${segment}` : segment;
  return folderSegments(joined).length > MAX_FOLDER_DEPTH ? null : joined;
}

/**
 * The readable half of a key, from the file the user chose.
 *
 * The charset here is exactly `[a-z0-9-]`, which is precisely what `publicUrl`
 * can concatenate without `encodeURIComponent`. That is why no new URL-encoding
 * step is needed anywhere in this feature — and why the usage scan can match on
 * a raw key.
 *
 * The extension is NOT taken from here. It comes from the validated MIME type,
 * exactly as the upload route has always done, so a file called `x.png` that is
 * really a PDF cannot name itself a PNG.
 */
export function slugifyFileName(name: string): string {
  const base = typeof name === "string" ? name.replace(/\.[^.]*$/, "") : "";

  const slug = base
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  // Something unnameable — a file called "文件.pdf" — still gets a key, because
  // the uuid after this is what makes it unique and the slug is only there to
  // be read.
  return slug || "file";
}

/**
 * A key this feature is allowed to touch.
 *
 * NOT ending in `/`, so a caller cannot delete a directory marker through the
 * file route and make a folder vanish from under somebody. See the note at the
 * top for why `startsWith` is the whole of the prefix defence.
 */
export function isMediaKey(key: unknown): key is string {
  if (typeof key !== "string") return false;
  if (key.length === 0 || key.length > 512) return false;
  if (!key.startsWith(MEDIA_PREFIX)) return false;
  if (key.endsWith("/")) return false;
  if (key.includes("..") || key.includes("//") || key.includes("%")) return false;

  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(key)) return false;

  return true;
}

/** The folder a key sits in, or "" for the root. */
export function folderOfKey(key: string): string {
  const rest = key.slice(MEDIA_PREFIX.length);
  const cut = rest.lastIndexOf("/");
  return cut < 0 ? "" : rest.slice(0, cut);
}
