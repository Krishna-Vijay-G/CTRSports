/**
 * The one place the media host is decided.
 *
 * Everything uploaded through the admin's media library is served from here:
 * the URLs `src/config/images.ts` builds for the defaults, the preconnect in
 * `src/app/layout.tsx`, and — through the same env var — the absolute URL
 * `publicUrl()` hands back to the admin on upload (`src/lib/server/s3.ts`).
 *
 * `NEXT_PUBLIC_` because this module is imported by content modules that end up
 * in the client bundle. That means it is inlined at BUILD time: changing the
 * value on Vercel needs a redeploy, not a restart.
 *
 * ── The fallback is the distribution, not the bucket ──────────────────────
 *
 * It was the bucket's own address, on the argument that an unset variable
 * should degrade to the behaviour this project had before the CDN. That
 * argument expired the day the distribution went in front of a bucket with
 * Block Public Access on: the S3 address now answers 403 for every object, so
 * falling back to it is not "slower", it is a site with no pictures at all.
 *
 * So the last resort is the distribution. It is the one environment-specific
 * literal in the source and it has to be kept in step with the variable above —
 * which is the price of a fallback that works. An unset variable is still a
 * mistake; this only decides whether the mistake is visible or total.
 *
 * The trailing-slash strip is what lets the variable be set either way round;
 * every caller joins with a `/` of its own.
 */
export const MEDIA_BASE_URL = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL || "https://d3mqgi8f34hcli.cloudfront.net"
).replace(/\/+$/, "");
