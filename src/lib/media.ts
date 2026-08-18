/**
 * Whether an address points at a picture or at a video, and where its poster is.
 *
 * ── Why the extension and not a stored field ──────────────────────────────
 *
 * Every image in this project is stored as a URL in a text column — a banner's
 * `image`, a partner's `logo`, a section's `data`, an article's `cover_image`,
 * a node inside a rich-text body. Adding "and is it a video?" as a second field
 * would mean touching all of them: a migration, twenty-six section models, every
 * normaliser, every panel and every renderer, to record something the address
 * already says.
 *
 * So the address says it. `…/opener-a1b2c3d4.mp4` is a video and
 * `…/opener-a1b2c3d4.webp` is not, which is a fact about a key the upload route
 * already decides from the file's MIME type — a file called `x.png` that is
 * really a video cannot name itself a PNG, and the reverse holds too.
 *
 * The cost is honest and small: a pasted external address with no extension
 * (`https://cdn.example.com/watch?v=…`) reads as an image and renders as a
 * broken one. That was already true of a pasted address that is not a picture,
 * and the field's own preview shows it immediately.
 *
 * ── The poster ────────────────────────────────────────────────────────────
 *
 * A `<video>` with nothing to show renders a black rectangle until its first
 * frame arrives, which on a banner is the first thing a visitor sees. So the
 * browser captures a frame at upload time and stores it BESIDE the video under
 * the same stem — `opener-a1b2c3d4.mp4` and `opener-a1b2c3d4.jpg` — and
 * `posterFor` swaps the extension to find it.
 *
 * Derived rather than stored, for the reason above. If the capture failed, or
 * the address was pasted from somewhere else, the poster 404s and the browser
 * falls back to the first frame — which is exactly the behaviour of no poster at
 * all, arrived at without a second field to keep in step.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

/** The still captured from a video at upload time. One format, so it is derivable. */
export const POSTER_EXTENSION = "jpg";

/** Pictures, and the extension each is stored as. */
export const IMAGE_TYPES: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
};

/**
 * Video containers, and the extension each is stored as.
 *
 * ── Storing is not playing ────────────────────────────────────────────────
 *
 * This table is deliberately much wider than the set of things a browser can
 * actually play, and the two must not be confused. An AVI, a WMV, an MKV or a
 * ProRes MOV will upload, be stored, and be served — and then show nothing in a
 * banner, because no browser decodes them. Nothing here transcodes; there is no
 * ffmpeg in a serverless bundle.
 *
 * That is still the right trade. Refusing the file at the picker tells somebody
 * their video is "unsupported" when what is actually wrong is fixable in
 * whatever they exported it from, and the file they hand over next is the same
 * file renamed. Accepting it puts the failure where it can be seen: the field's
 * own preview plays what a visitor will get, so a container the browser cannot
 * decode reads as a blank box immediately, in the admin, next to the file that
 * caused it.
 *
 * **MP4 (H.264) plays everywhere.** WebM is the other safe one. Everything
 * below those two is a container this will keep for you, not a promise that it
 * will play.
 *
 * Several MIME types map to one extension on purpose — `video/avi`,
 * `video/msvideo` and `video/x-msvideo` are the same thing under three names,
 * and which one arrives depends on the operating system rather than the file.
 */
export const VIDEO_TYPES: Record<string, string> = {
  // The two that actually play in every browser.
  "video/mp4": "mp4",
  "video/webm": "webm",

  // Widely produced, variably playable.
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
  "video/mp4v-es": "m4v",
  "video/ogg": "ogv",
  "video/3gpp": "3gp",
  "video/3gpp2": "3g2",

  // Stored, and almost certainly not playable in a browser.
  "video/x-matroska": "mkv",
  "video/x-msvideo": "avi",
  "video/msvideo": "avi",
  "video/avi": "avi",
  "video/divx": "divx",
  "video/x-ms-wmv": "wmv",
  "video/x-ms-asf": "asf",
  "video/x-ms-vob": "vob",
  "video/dvd": "vob",
  "video/mpeg": "mpg",
  "video/x-mpeg": "mpg",
  "video/mp2t": "ts",
  "video/x-flv": "flv",
  "video/x-f4v": "f4v",
  "video/x-dv": "dv",
  "video/mxf": "mxf",
};

/**
 * Everything that may be uploaded. The two tables above, joined.
 *
 * The upload routes share this so the direct-to-S3 path and the
 * through-the-server path cannot come to admit different things.
 */
export const UPLOAD_TYPES: Record<string, string> = { ...IMAGE_TYPES, ...VIDEO_TYPES };

/**
 * What `isVideoUrl` reads an address against.
 *
 * Derived from the table rather than written out beside it, because the two
 * lists drifting apart has one specific and nasty symptom: a container that
 * uploads happily and then renders as a broken `<img>`, since this list is the
 * ONLY thing that decides whether an address is drawn as a picture or as a
 * video. See the note at the top of this file for why that is an extension and
 * not a database column.
 *
 * `ogg` is here without being in the table: `video/ogg` is stored as `.ogv`,
 * but an address ending `.ogg` pasted in by hand is a video and always was.
 */
export const VIDEO_EXTENSIONS: readonly string[] = [
  ...new Set([...Object.values(VIDEO_TYPES), "ogg"]),
];

/**
 * How big each kind may be.
 *
 * ── Pictures: no ceiling ──────────────────────────────────────────────────
 *
 * There used to be one, at four megabytes, described as a backstop against a
 * caller that skipped the browser-side WebP conversion. What it actually did
 * was refuse the commonest thing anybody has — a photograph straight off a
 * phone, which is six or twelve megabytes BEFORE conversion and a few hundred
 * kilobytes after it. The check ran on the file as picked, so the conversion
 * that would have made the number irrelevant never got to happen.
 *
 * So there is no ceiling now. It is affordable because no picture passes
 * through a server any more: every uploader in the admin signs a PUT and sends
 * the bytes straight to S3, which is what stopped the platform's own
 * four-and-a-half megabyte body limit from being the real ceiling standing
 * behind this one. See src/lib/client/upload.ts.
 *
 * ── Video: still 200 MB ───────────────────────────────────────────────────
 *
 * A video is not converted by anything — there is no ffmpeg in a serverless
 * bundle and no transcoding pipeline here — so what is uploaded is what every
 * visitor downloads, and the number is a bandwidth decision as much as a
 * storage one. 200 MB is roughly three minutes of good 1080p; a banner loop
 * that size would be a mistake, and the field says so.
 */
export const MAX_IMAGE_BYTES = Number.POSITIVE_INFINITY;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

/**
 * What a body may hold when it goes THROUGH a server instead of to S3.
 *
 * Not a policy of this project's: the platform it deploys to refuses a
 * serverless request body over about four and a half megabytes, in front of the
 * function, where no constant here can reach it. `/api/admin/upload` checks
 * against this so a file too big for that path is refused with a sentence
 * rather than with the platform's own HTML error page. Nothing in the admin
 * posts there now — it is kept for callers outside it.
 */
export const MAX_SERVER_UPLOAD_BYTES = 4 * 1024 * 1024;

/** Whether an extension is one this project draws as a video. */
export function isVideoExtension(extension: string): boolean {
  return VIDEO_EXTENSIONS.includes(extension);
}

/**
 * The extension a file will be stored as, or "" if it may not be uploaded.
 *
 * ── Why the name is consulted at all ──────────────────────────────────────
 *
 * The rule used to be absolute: the extension comes from the MIME type and
 * never from the name, so a file called `x.png` that is really a video cannot
 * name itself a PNG. That rule is still here and still doing its job — the name
 * is only ever allowed to CHOOSE FROM the tables above, never to invent
 * something that is not in them.
 *
 * It is consulted because the browser frequently does not know. Windows reports
 * an empty `type` for `.mkv` and often for `.avi` and `.mov`; some pickers hand
 * back `application/octet-stream` for anything they have no association for.
 * Refusing those means telling somebody their video is an unsupported file type
 * when the file is fine and only the operating system was vague, which is both
 * wrong and impossible to act on.
 *
 * So: trust the MIME type when there is one to trust, fall back to the name
 * when there is not, and refuse when neither names something in the tables.
 * A file that both claims a real type and has a name is never read from its
 * name — the mismatch case that the original rule exists for cannot arise.
 */
export function extensionFor(type: string, name = ""): string {
  // `video/mp4; codecs="avc1.42E01E"` is a legal thing for a browser to say.
  const clean = (type || "").split(";")[0].trim().toLowerCase();
  if (clean && clean in UPLOAD_TYPES) return UPLOAD_TYPES[clean];

  // Only where the browser genuinely said nothing useful. A type that IS known
  // and is not in the tables — `image/tiff`, `application/pdf` — is a refusal,
  // not an invitation to go looking at the name for a second opinion.
  const vague = !clean || clean === "application/octet-stream" || clean === "video/*";
  if (!vague && !clean.startsWith("video/")) return "";

  const fromName = extensionOf(name);
  return Object.values(UPLOAD_TYPES).includes(fromName) ? fromName : "";
}

/** The ceiling for a stored extension, or 0 for one that may not be uploaded. */
export function maxBytesForExtension(extension: string): number {
  if (!extension) return 0;
  return isVideoExtension(extension) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
}

/**
 * The sentence a route sends back for a type it will not take.
 *
 * It names what the file WAS, because the commonest cause of getting here is
 * now an image format nobody thought about — a HEIC straight off an iPhone, a
 * TIFF out of a scanner — and "unsupported file type" gives somebody nothing to
 * act on, while "image/heic" tells them exactly what to convert.
 */
export function unsupportedType(type: string, name = ""): string {
  const declared = (type || "").split(";")[0].trim();
  const named = extensionOf(name);

  const seen = declared || (named ? `a .${named} file` : "of a type the browser could not name");

  return `This file is ${seen}, which cannot be uploaded. Pictures: WebP, PNG, JPEG or SVG. Video: MP4 and WebM play in every browser, and most other common containers are accepted too.`;
}

/** The standing version, for a caller with no particular file to talk about. */
export const UNSUPPORTED_TYPE = unsupportedType("");
/**
 * The MIME type an object is STORED and SERVED as — the tables, reversed.
 *
 * This matters more than it looks. A `<video>` decides what it is holding from
 * the `Content-Type` header, not from the address, so an object written with an
 * empty or generic type plays nowhere no matter how good the file is. Since the
 * browser is now allowed to hand over a file it could not name, something has
 * to name it before it goes in the bucket, and the extension is the one thing
 * that has already been resolved by then.
 *
 * It also canonicalises: `video/msvideo` and `video/avi` both resolve to `avi`
 * and come back out as `video/x-msvideo`, so the bucket holds one spelling for
 * one format rather than whichever spelling the uploader's operating system
 * happened to use.
 *
 * The tables are small and this runs once per upload, so the scan is cheaper
 * than a second table that could fall out of step with the first.
 */
export function contentTypeFor(extension: string): string {
  const found = Object.entries(UPLOAD_TYPES).find(([, value]) => value === extension);
  return found ? found[0] : "application/octet-stream";
}

/**
 * What a file picker offers.
 *
 * Three kinds of entry, because no one of them is enough. The MIME types cover
 * the ordinary case; `video/*` catches containers this does not list, so
 * somebody with an unusual file can at least SELECT it and get a sentence
 * explaining the refusal instead of a picker that greys it out for reasons it
 * cannot state; and the bare extensions catch the files the operating system
 * has no MIME association for at all, which on Windows includes `.mkv` and
 * frequently `.avi`.
 */
export const UPLOAD_ACCEPT = [
  ...Object.keys(UPLOAD_TYPES),
  "video/*",
  ...new Set(Object.values(UPLOAD_TYPES).map((extension) => `.${extension}`)),
].join(",");

/** `4 MB`, `200 MB` — for a message, not for arithmetic. */
export function megabytes(bytes: number): string {
  if (!Number.isFinite(bytes)) return "unlimited";
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

/**
 * The extension of an address, lower case, without the dot.
 *
 * The query string and the fragment are cut off first: a signed URL carries
 * `?X-Amz-Signature=…` after the key, and reading backwards from the end of the
 * whole string would find the extension of nothing.
 */
export function extensionOf(url: string): string {
  const path = url.split(/[?#]/, 1)[0];
  const cut = path.lastIndexOf(".");
  const slash = path.lastIndexOf("/");

  if (cut < 0 || cut < slash) return "";
  return path.slice(cut + 1).toLowerCase();
}

/** Whether this address should be drawn as a video rather than a picture. */
export function isVideoUrl(url: unknown): boolean {
  if (typeof url !== "string" || !url) return false;
  return (VIDEO_EXTENSIONS as readonly string[]).includes(extensionOf(url));
}

/**
 * The still that sits beside a video, or "" for anything that is not one.
 *
 * Same address with the extension swapped. Not checked for existence — that is
 * the browser's job, and its answer to a missing poster is the right one.
 */
export function posterFor(url: string): string {
  if (!isVideoUrl(url)) return "";

  const [path, tail = ""] = splitQuery(url);
  const cut = path.lastIndexOf(".");
  return `${path.slice(0, cut + 1)}${POSTER_EXTENSION}${tail}`;
}

/** The poster's key for a video's key. What the upload route signs the pair with. */
export function posterKeyFor(key: string): string {
  const cut = key.lastIndexOf(".");
  return cut < 0 ? `${key}.${POSTER_EXTENSION}` : `${key.slice(0, cut + 1)}${POSTER_EXTENSION}`;
}

function splitQuery(url: string): [string, string] {
  const at = url.search(/[?#]/);
  return at < 0 ? [url, ""] : [url.slice(0, at), url.slice(at)];
}
