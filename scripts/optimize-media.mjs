/**
 * One-shot media optimizer.
 *
 * The repo shipped camera-original assets straight to the browser: a 6000x4000
 * 9.3 MB hero JPEG, 1343x756 logos rendered at 36 px tall, 1510x1510 sport
 * badges. With `images.unoptimized` now off, next/image handles FORMAT
 * negotiation (AVIF/WebP) per browser — but it still has to read the source, and
 * a 6000 px source costs memory and transform time on every cold cache. So the
 * job here is DIMENSIONS, not format: cap each asset at the largest size it is
 * ever displayed at, times a 2x DPR allowance.
 *
 * Paths and extensions are deliberately preserved, so nothing in the app has to
 * change and next/image keeps serving modern formats off these sources.
 *
 * Originals are moved to public/_originals/ (git-ignored) before anything is
 * written, so this is reversible: `node scripts/optimize-media.mjs --restore`.
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
 * Longest edge each asset class is allowed to keep, already doubled for retina.
 * Order matters — the first matching rule wins.
 */
const RULES = [
  // Full-bleed hero art. Displayed edge-to-edge, so 2560 covers a 2x 1280 viewport.
  { test: /^images\/car\/hero\.(jpg|jpeg)$/i, max: 2560, quality: 78 },
  { test: /^media\/background\.(jpe?g|png)$/i, max: 2560, quality: 78 },

  // Chapter / panel photography — half-width columns at most.
  { test: /^images\/journey\/(panels|incrc|origin)\//i, max: 1600, quality: 78 },
  { test: /^images\/team\//i, max: 1200, quality: 78 },

  // Social card. Spec is exactly 1200x630; never needs more.
  { test: /^images\/journey\/og-journey\.(jpg|jpeg)$/i, max: 1200, quality: 82 },

  // Sport badges + team crests. Largest real render is ~320 px, so 640 is 2x.
  { test: /^media\/(volley|cricket|hockey|pickle)\.png$/i, max: 640 },
  { test: /^media\/ctr-(national-racing|f4-championship)\.png$/i, max: 640 },
  { test: /^images\/journey\/teams\//i, max: 640 },
  { test: /^images\/journey\/logos\//i, max: 480 },

  // Wordmarks/logos. Biggest render is the academy hero watermark at ~208 px
  // wide (lg:w-52), so 640 leaves headroom at 3x.
  { test: /^(images\/(journey|logos)|media)\/CTR_(yellow|blue)\.png$/i, max: 640 },
  { test: /^media\/ctr-logo\.png$/i, max: 640 },

  // Sponsor/federation marks sit in a footer strip.
  { test: /^images\/sponsors\//i, max: 480 },

  // Catch-all for anything else raster under public/.
  { test: /\.(png|jpe?g)$/i, max: 1600, quality: 80 },
];

const SKIP_DIRS = new Set(["_originals", "video"]);

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

    pipeline = isPng
      ? pipeline.png({ compressionLevel: 9, palette: true, quality: 90, effort: 8 })
      : pipeline.jpeg({ quality: rule.quality ?? 80, progressive: true, mozjpeg: true });

    const output = await pipeline.toBuffer();

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
      dims: needsResize ? `${meta.width}x${meta.height} -> max ${rule.max}` : "recompressed",
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
      `${kb(r.from).padStart(9)} -> ${kb(r.to).padStart(8)}  (-${String(pct).padStart(2)}%)  ${r.rel}  [${r.dims}]`
    );
  }

  console.log(
    `\n${DRY ? "[dry run] " : ""}${touched} file(s): ${(before / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB ` +
      `(saved ${((before - after) / 1048576).toFixed(2)} MB, -${(100 - (after / before) * 100).toFixed(0)}%)`
  );
  if (!DRY) console.log("Originals preserved in public/_originals/ (restore with --restore).");
}

await (RESTORE ? restore() : optimize());
