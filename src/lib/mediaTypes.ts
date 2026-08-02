/** MIME types accepted for post media, shared by the API routes and the admin UI. */

export const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export const VIDEO_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-m4v": "m4v",
};

export const MEDIA_EXTENSIONS = { ...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS };

/** Vercel caps a serverless request body at ~4.5 MB. */
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Videos bypass the API route entirely via a presigned PUT. */
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

export const ACCEPT_ATTRIBUTE = [
  ...Object.keys(IMAGE_EXTENSIONS),
  ...Object.keys(VIDEO_EXTENSIONS),
].join(",");

export function extensionFor(contentType: string): string | null {
  return MEDIA_EXTENSIONS[contentType] ?? null;
}

export function isVideoType(contentType: string): boolean {
  return contentType in VIDEO_EXTENSIONS;
}
