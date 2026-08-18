/**
 * Browser-side: turn whatever the admin picked into a WebP before it ever
 * leaves the machine.
 *
 * Doing it here rather than on the server is what keeps the upload route
 * dependency-free — no sharp in the serverless bundle — and means the bytes
 * stored in S3 are already the bytes the page will serve. There is no resizing
 * at request time anywhere in this project; one file is uploaded and that file
 * is what every visitor downloads.
 *
 * ── Which is why the ceiling has to be right ──────────────────────────────
 *
 * It was 768 for everything, with a comment explaining that crests are drawn at
 * 256 CSS px so 768 covers a 3x screen. That was true of crests, and this
 * function only handled crests when it was written. It handles banners, article
 * covers, event photographs and track photographs now, and it was storing a
 * 6480px source as 768×256 — then a full-bleed banner drew it across a 1440 px
 * viewport, an upscale of nearly 2x, or 3.75x on a retina screen. That is the
 * pixel break; the encoder quality was never the main part of it.
 *
 * The numbers below mirror `scripts/convert-webp.mjs`, which sizes the static
 * images in /public and had them right all along — a full-bleed hero at 2560
 * and quality 92. An uploaded banner and a built-in one land in the same slot,
 * so there was never a good reason for them to be encoded differently, and the
 * difference was plainly visible.
 *
 * SVG is passed through untouched: it is already tiny and rasterising it would
 * be a downgrade. Anything that fails to decode is passed through too — which
 * costs nothing now that uploads go straight to S3 with no size ceiling.
 */

/**
 * The longest edge each kind of picture is capped at.
 *
 * CEILINGS, not targets: a picture smaller than its ceiling is never scaled up,
 * because nothing is gained by storing pixels the original did not have.
 */

/**
 * A crest, a wordmark or a splash logo.
 *
 * The largest of these is the splash mark at `w-[min(190px,42vw)]`, which is the
 * `brand/` rule in convert-webp.mjs and is capped at 1024 there. A crest wants
 * only 768, but the two share this field and the difference is a few kilobytes
 * on something drawn at 48 px — so the ceiling is the larger of the two rather
 * than a third number nobody can map back to a layout.
 */
export const LOGO_EDGE = 1024;

/**
 * A photograph or a banner — the default, because it is the common case and a
 * caller that says nothing should get the good one rather than the cheap one.
 *
 * Matches the `hero/` rule in scripts/convert-webp.mjs. Enough for a full-bleed
 * image on a 1280 px layout at 2x, which is the widest thing this site draws.
 */
export const PHOTO_EDGE = 2560;

/**
 * A scanned page, in a deck or inside an article.
 *
 * Read at close to 1000 CSS px, so 2048 is a touch over 2x — the same number
 * convert-webp.mjs uses for a figure at that width. It was 1600, which was
 * already the largest of the old ceilings and still arrived soft.
 */
export const DOCUMENT_EDGE = 2048;

/**
 * Quality, and a backstop that is not a target.
 *
 * There used to be a flat 400 KB budget with qualities of 0.9, 0.8 and 0.7
 * tried against it. A flat budget punishes exactly the pictures that need the
 * bytes: a big photograph could not reach 400 KB at any of the three, so it
 * always fell through to 0.7 — the worst setting, reserved for the largest
 * images. It existed because an upload had to survive a serverless request
 * body of about four and a half megabytes, and nothing goes through a server
 * any more.
 *
 * So: encode once at 92, the same as the static pipeline. The fallbacks are a
 * guard against a pathological file, not a size policy, and 2 MB is far above
 * anything a photograph produces at this ceiling.
 */
const QUALITY = 0.92;
const CEILING_BYTES = 2 * 1024 * 1024;
const FALLBACK_QUALITIES = [0.86, 0.8];

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

export async function toWebp(file: File, maxEdge: number = PHOTO_EDGE): Promise<File> {
  if (file.type === "image/svg+xml") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext("2d");
    if (!context) return file;

    // Two words, and the difference between a resampled photograph and an
    // aliased one. The default is "low", which on a 2.5x downscale from a
    // camera original shows as stair-stepping along every hard edge.
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    const asFile = (blob: Blob) => new File([blob], name, { type: "image/webp" });

    const best = await canvasToBlob(canvas, QUALITY);
    if (!best) return file;
    if (best.size <= CEILING_BYTES) return asFile(best);

    // Only reached by something enormous and busy. Step down until it fits,
    // and send the smallest attempt if nothing does — still better than the
    // original, which is what the alternative would upload.
    let smallest = best;
    for (const quality of FALLBACK_QUALITIES) {
      const blob = await canvasToBlob(canvas, quality);
      if (!blob) continue;
      if (blob.size < smallest.size) smallest = blob;
      if (blob.size <= CEILING_BYTES) return asFile(blob);
    }

    return asFile(smallest);
  } catch {
    return file;
  }
}
