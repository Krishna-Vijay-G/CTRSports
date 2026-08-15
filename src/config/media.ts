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
 * The S3 address survives only as a last-resort fallback, so an unset variable
 * degrades to the behaviour this project had before the CDN rather than
 * emitting `undefined/...` into every default image. It is the only S3 hostname
 * left in the source apart from the template in `src/lib/server/s3.ts`.
 *
 * The trailing-slash strip is what lets the variable be set either way round;
 * every caller joins with a `/` of its own.
 */
export const MEDIA_BASE_URL = (
  process.env.NEXT_PUBLIC_MEDIA_BASE_URL ||
  "https://ctrsports-media-storage.s3.us-east-1.amazonaws.com"
).replace(/\/+$/, "");
