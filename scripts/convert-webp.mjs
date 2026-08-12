/**
 * Turns every PNG/JPEG under public/images into a resized WebP.
 *
 *   npm run webp            convert everything not already converted
 *   npm run webp -- --dry   report what it would do, write nothing
 *   npm run webp -- --force re-convert even where a .webp already exists
 *   npm run webp -- --restore  put the original files back
 *
 * Nothing resizes images at request time — the site uses plain <img> tags
 * pointing straight at these files, so what is on disk is exactly what every
 * visitor downloads. This script is the only thing standing between a camera
 * original and the browser.
 *
 * Each rule caps an asset at the largest size it is actually drawn at, times 3
 * so it stays sharp on a 3x phone screen. Sizing below that is what makes images
 * look soft, and no CSS can recover detail the file no longer has.
 *
 * Originals are moved to public/_originals/ (git-ignored) before anything is
 * written, so --restore always has something to restore from.
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const IMAGES = path.join(ROOT, "public", "images");
const BACKUP = path.join(ROOT, "public", "_originals");

const DRY = process.argv.includes("--dry");
const FORCE = process.argv.includes("--force");
const RESTORE = process.argv.includes("--restore");

/**
 * Longest edge each class of asset keeps. `at` records where the display size
 * comes from, so a cap can be rechecked when a layout changes. First match wins.
 */
const RULES = [
  { test: /^hero\//i, max: 2560, quality: 80, at: "full-bleed hero, 2x at 1280" },
  { test: /^sports\//i, max: 768, quality: 90, at: "SportRow md:h-64 = 256px" },
  { test: /^brand\//i, max: 640, quality: 90, at: "splash logo w-[240px]" },
  // Partner marks sit at h-8/h-9 but are wordmarks — undersizing them is what
  // makes small type furry, so they get far more than 3x their drawn height.
  { test: /^incrc\/(jktyre|fmsci)\./i, max: 480, quality: 92, at: "partner lockup h-9 = 36px" },
  { test: /^incrc\/family\./i, max: 2560, quality: 80, at: "full-bleed banner" },
  { test: /^incrc\//i, max: 1600, quality: 84, at: "half-width figure, 2x at 800" },
  { test: /./, max: 1600, quality: 82, at: "default" },
];

const SOURCE_EXTENSIONS = /\.(png|jpe?g)$/i;

function ruleFor(relativePath) {
  const key = relativePath.split(path.sep).join("/");
  return RULES.find((rule) => rule.test.test(key));
}

/** Every file under `dir`, as paths relative to it. */
async function walk(dir, base = dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full, base)));
    } else {
      files.push(path.relative(base, full));
    }
  }

  return files;
}

function kb(bytes) {
  return `${Math.round(bytes / 1024)} KB`;
}

async function restore() {
  const files = await walk(BACKUP);
  if (files.length === 0) {
    console.log("Nothing in public/_originals to restore.");
    return;
  }

  for (const relative of files) {
    const target = path.join(IMAGES, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(path.join(BACKUP, relative), target);

    // Drop the WebP that replaced it, so the original is what gets served again.
    const webp = target.replace(SOURCE_EXTENSIONS, ".webp");
    await fs.rm(webp, { force: true });

    console.log(`restored  ${relative}`);
  }

  console.log(`\nRestored ${files.length} file(s).`);
}

async function convert() {
  const files = (await walk(IMAGES)).filter((file) => SOURCE_EXTENSIONS.test(file));

  if (files.length === 0) {
    console.log("No PNG or JPEG files under public/images — nothing to do.");
    return;
  }

  let converted = 0;
  let before = 0;
  let after = 0;

  for (const relative of files) {
    const source = path.join(IMAGES, relative);
    const target = source.replace(SOURCE_EXTENSIONS, ".webp");
    const rule = ruleFor(relative);

    if (!FORCE) {
      const exists = await fs.stat(target).then(
        () => true,
        () => false
      );
      if (exists) {
        console.log(`skip      ${relative}  (${path.basename(target)} already exists)`);
        continue;
      }
    }

    const original = await fs.readFile(source);
    const image = sharp(original);
    const meta = await image.metadata();
    const longest = Math.max(meta.width ?? 0, meta.height ?? 0);

    const output = await image
      // `withoutEnlargement` means a small source is re-encoded, never upscaled.
      .resize({ width: rule.max, height: rule.max, fit: "inside", withoutEnlargement: true })
      .webp({ quality: rule.quality, effort: 6 })
      .toBuffer();

    before += original.length;
    after += output.length;
    converted += 1;

    console.log(
      `${DRY ? "would    " : "convert  "}${relative} -> ${path.basename(target)}  ` +
        `${longest}px ${kb(original.length)} -> ${Math.min(longest, rule.max)}px ${kb(output.length)}  [${rule.at}]`
    );

    if (DRY) continue;

    // Preserve the original before the source file is removed. An existing
    // backup is never overwritten, so re-running cannot lose the true original.
    const backup = path.join(BACKUP, relative);
    const backedUp = await fs.stat(backup).then(
      () => true,
      () => false
    );
    if (!backedUp) {
      await fs.mkdir(path.dirname(backup), { recursive: true });
      await fs.writeFile(backup, original);
    }

    await fs.writeFile(target, output);
    await fs.rm(source);
  }

  if (converted === 0) {
    console.log("\nNothing to convert. Pass --force to redo files that already have a .webp.");
    return;
  }

  const saved = before - after;
  console.log(
    `\n${DRY ? "Would convert" : "Converted"} ${converted} file(s): ` +
      `${kb(before)} -> ${kb(after)} (${kb(saved)} saved, ${Math.round((saved / before) * 100)}%).`
  );
  if (!DRY) console.log("Originals kept in public/_originals/ — `npm run webp -- --restore` undoes this.");
}

try {
  await (RESTORE ? restore() : convert());
} catch (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
