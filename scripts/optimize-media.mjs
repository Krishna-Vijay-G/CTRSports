/**
 * Media optimizer — run it after adding or replacing anything under public/.
 *
 * The repo shipped camera-original assets straight to the browser: a 6000x4000
 * 9.3 MB hero JPEG, 1343x756 wordmarks drawn at 36 px tall, 1510x1510 crests
 * shown at 128. Nothing resizes images at request time — the site uses plain
 * <img> tags pointing at these files — so whatever is on disk is exactly what
 * every visitor downloads, and this script is the only thing standing between
 * a camera original and the browser.
 *
 * Each rule caps an asset at the largest size it is actually drawn at, times 3
 * so it stays sharp on a 3x phone screen. Sizing below that is what makes
 * images look soft, and no CSS can recover detail the file no longer has.
 *
 * Paths and extensions are preserved, so nothing in the app has to change.
 *
 * Originals are copied to public/_originals/ (git-ignored) before anything is
 * written, so this is reversible: `node scripts/optimize-media.mjs --restore`.
 * Re-running never overwrites a preserved original, so it is safe to iterate on
 * the rules and re-run as often as needed.
 *
 *   node scripts/optimize-media.mjs [--dry] [--restore]
 */

import { Buffer } from "node:buffer";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const BACKUP = path.join(PUBLIC, "_originals");

const DRY = process.argv.includes("--dry");
const RESTORE = process.argv.includes("--restore");

/**
 * Longest edge each asset class keeps.
 *
 * Nothing resizes these at request time — every image is a plain <img> pointing
 * straight at the file, so what is on disk is exactly what the browser
 * downloads. Each cap is therefore the largest CSS size the asset is ever drawn
 * at, times 3 so it stays sharp on a 3x phone screen. The `at` note records
 * where that display size comes from, so the cap can be rechecked when a layout
 * changes. Order matters — the first matching rule wins.
 */
const RULES = [
  // Full-bleed backgrounds. 2560 covers a 2x 1280 viewport and 1x at 2560.
  { test: /^images\/car\/hero\.(jpg|jpeg)$/i, max: 2560, quality: 82, at: "academy hero, full bleed" },
  { test: /^media\/background\.(jpe?g|png)$/i, max: 2560, quality: 82, at: "landing hero, full bleed" },

  // Chapter photography sits in a half-width column, ~720 CSS wide at most.
  { test: /^images\/journey\/(panels|incrc|origin|academy)\//i, max: 1600, quality: 82, at: "half-width column" },
  { test: /^images\/team\//i, max: 1200, quality: 82, at: "team portraits" },

  // Social card. Spec is exactly 1200x630; never rendered on the site.
  { test: /^images\/journey\/og-journey\.(jpg|jpeg)$/i, max: 1200, quality: 85, at: "og:image spec" },

  // Sport crests peak at SportHero's lg:h-80 (320 CSS px) -> 960 at 3x.
  { test: /^media\/(volley|cricket|hockey|pickle)\.png$/i, max: 960, at: "SportHero lg:h-80 = 320px" },
  { test: /^media\/ctr-(national-racing|f4-championship)\.png$/i, max: 960, at: "SportHero lg:h-80 = 320px" },
  { test: /^media\/ctr-logo\.png$/i, max: 960, at: "SportHero lg:h-80 = 320px" },

  // Team crests only ever appear in UnifiedChapter at max-h-32 (128 CSS px).
  { test: /^images\/journey\/teams\//i, max: 384, at: "UnifiedChapter max-h-32 = 128px" },

  // Wordmarks peak at the academy hero watermark, lg:w-52 (208 CSS px).
  { test: /^(images\/(journey|logos)|media)\/CTR_(yellow|blue)\.png$/i, max: 640, at: "JourneyHero lg:w-52 = 208px" },

  // Partner / federation marks in the lockup strip, sm:h-11 (44 CSS px).
  { test: /^images\/journey\/logos\//i, max: 320, at: "PartnerLockup sm:h-11 = 44px" },
  { test: /^images\/sponsors\//i, max: 320, at: "sponsor strip" },

  // Catch-all for anything else raster under public/.
  { test: /\.(png|jpe?g)$/i, max: 1600, quality: 82, at: "default" },
];

const SKIP_DIRS = new Set(["_originals", "video"]);

/**
 * Largest average per-channel difference (0-255) tolerated before a paletted
 * PNG is rejected as visibly degraded. ~1.5 is well under what the eye picks up
 * on a gradient, while still admitting the flat-colour marks that compress well.
 */
const MAX_RMSE = 1.5;

/** Root-mean-square per-channel difference between two encoded images. */
async function pixelRmse(a, b) {
  const toRaw = (buf) =>
    sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const [ra, rb] = await Promise.all([toRaw(a), toRaw(b)]);
  if (ra.data.length !== rb.data.length) return Infinity;

  let sum = 0;
  for (let i = 0; i < ra.data.length; i++) {
    const d = ra.data[i] - rb.data[i];
    sum += d * d;
  }
  return Math.sqrt(sum / ra.data.length);
}

function ruleFor(rel) {
  const key = rel.split(path.sep).join("/");
  return RULES.find((r) => r.test.test(key)) ?? null;
}

async function* walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else {
      yield path.join(dir, entry.name);
    }
  }
}

const kb = (n) => `${(n / 1024).toFixed(0)} KB`;

async function restore() {
  let count = 0;
  for await (const abs of walk(BACKUP)) {
    const rel = path.relative(BACKUP, abs);
    const target = path.join(PUBLIC, rel);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(abs, target);
    count += 1;
  }
  console.log(`Restored ${count} original(s) from public/_originals/.`);
}

async function optimize() {
  let before = 0;
  let after = 0;
  let touched = 0;
  const rows = [];

  for await (const abs of walk(PUBLIC)) {
    const rel = path.relative(PUBLIC, abs);
    const rule = ruleFor(rel);
    if (!rule) continue;

    const original = await fs.stat(abs);
    // Read into memory rather than letting sharp open the path: on Windows the
    // lazy file handle is still held when we write the result back to the same
    // path, which fails with UNKNOWN/EBUSY.
    const source = await fs.readFile(abs);
    const image = sharp(source, { failOn: "none" });
    const meta = await image.metadata();
    if (!meta.width || !meta.height) continue;

    const longest = Math.max(meta.width, meta.height);
    const needsResize = longest > rule.max;

    // PNGs keep their alpha channel; JPEGs re-encode as progressive mozjpeg.
    const isPng = meta.format === "png";
    let pipeline = image;
    if (needsResize) {
      pipeline = pipeline.resize({
        width: meta.width >= meta.height ? rule.max : undefined,
        height: meta.height > meta.width ? rule.max : undefined,
        withoutEnlargement: true,
        fit: "inside",
      });
    }

    let output;
    let note = "";

    if (isPng) {
      // Palette quantisation shrinks these enormously but can band a smooth
      // gradient — it is what dulled the gold in the CTR wordmarks last time.
      // Rather than guess, encode both ways and measure: keep the palette
      // version only when its pixels are near-identical to the lossless one.
      const lossless = await pipeline.clone().png({ compressionLevel: 9, effort: 10 }).toBuffer();
      const paletted = await pipeline
        .clone()
        .png({ compressionLevel: 9, effort: 10, palette: true, quality: 90, dither: 1 })
        .toBuffer();

      const rmse = await pixelRmse(lossless, paletted);
      if (rmse <= MAX_RMSE && paletted.length < lossless.length) {
        output = paletted;
        note = `palette rmse ${rmse.toFixed(2)}`;
      } else {
        output = lossless;
        note = `lossless (rmse ${rmse.toFixed(2)})`;
      }
    } else {
      output = await pipeline
        .jpeg({ quality: rule.quality ?? 82, progressive: true, mozjpeg: true })
        .toBuffer();
    }

    // Never make a file bigger; some assets are already well-encoded.
    if (output.length >= original.size && !needsResize) continue;
    const chosen = output.length < original.size ? output : null;
    if (!chosen) continue;

    before += original.size;
    after += chosen.length;
    touched += 1;
    rows.push({
      rel: rel.split(path.sep).join("/"),
      from: original.size,
      to: chosen.length,
      dims: needsResize ? `${meta.width}x${meta.height} -> ${rule.max}` : "recompressed",
      note,
    });

    if (DRY) continue;

    const backupPath = path.join(BACKUP, rel);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    // Only back up the first time, so re-running never clobbers a true original.
    try {
      await fs.access(backupPath);
    } catch {
      await fs.copyFile(abs, backupPath);
    }
    await fs.writeFile(abs, chosen);
  }

  rows.sort((a, b) => b.from - a.from);
  for (const r of rows) {
    const pct = (100 - (r.to / r.from) * 100).toFixed(0);
    console.log(
      `${kb(r.from).padStart(9)} -> ${kb(r.to).padStart(8)}  (-${String(pct).padStart(2)}%)  ${r.rel}  [${r.dims}${r.note ? "; " + r.note : ""}]`
    );
  }

  console.log(
    `\n${DRY ? "[dry run] " : ""}${touched} file(s): ${(before / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB ` +
      `(saved ${((before - after) / 1048576).toFixed(2)} MB, -${(100 - (after / before) * 100).toFixed(0)}%)`
  );
  if (!DRY) console.log("Originals preserved in public/_originals/ (restore with --restore).");
}

await (RESTORE ? restore() : optimize());
