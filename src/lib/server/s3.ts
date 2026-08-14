import "server-only";

import {
  DeleteObjectsCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

/**
 * Everything this project writes lives under one prefix, which is what keeps
 * the media library from listing another site's uploads — the bucket is shared.
 */
export const MEDIA_PREFIX = "ctr-unified/media/";

/**
 * Where a registration attachment goes. A different prefix, deliberately.
 *
 * Everything under MEDIA_PREFIX is a logo or a photograph meant to be on a web
 * page, and is served straight from the bucket with a public, immutable cache
 * header. These are licence scans, indemnity forms and passport photographs
 * belonging to named people — they are never given a public URL and never
 * appear in the media library. They leave only through an authenticated admin
 * route that streams them; see the attachment route.
 *
 * Separate prefixes are also what makes deleting a form's files possible
 * without touching anything else.
 */
export const ENTRY_PREFIX = "ctr-unified/entries/";

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.S3_REGION;

let client: S3Client | null = null;

function getClient(): S3Client {
  if (client) return client;

  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if (!BUCKET || !REGION || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 is not configured. Set S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY."
    );
  }

  client = new S3Client({ region: REGION, credentials: { accessKeyId, secretAccessKey } });
  return client;
}

/** Lets the admin fall back to pasting a URL when the bucket is not wired up. */
export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_REGION &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY
  );
}

/**
 * Public URL for a stored object — CloudFront's, unless nothing is configured.
 *
 * Two variables, one answer. NEXT_PUBLIC_MEDIA_BASE_URL is the one that matters
 * now: it is the same value the client-side constant in src/config/media.ts
 * reads, so one setting covers both the URLs written into the database on upload
 * and the ones the default images are built from. Setting only one of the two
 * was how the site ended up serving the same object from two hostnames.
 *
 * S3_PUBLIC_BASE_URL is kept, and kept FIRST, because it predates the media
 * domain and someone may already have it set; an env var that quietly stops
 * being read is worse than one that is merely redundant.
 *
 * Neither set falls back to the virtual-hosted S3 address, which is today's
 * behaviour and works as long as the bucket stays publicly readable.
 */
export function publicUrl(key: string): string {
  const base = (
    process.env.S3_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_MEDIA_BASE_URL
  )?.replace(/\/+$/, "");

  return base ? `${base}/${key}` : `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

/**
 * Uploads and returns the public URL. Objects are written under a content-hashed
 * or uuid key and never overwritten, so `immutable` is honest.
 */
export type MediaObject = {
  key: string;
  url: string;
  size: number;
  /** ISO string — the client only ever displays or sorts it. */
  uploadedAt: string;
};

/**
 * Everything under MEDIA_PREFIX, newest first.
 *
 * S3 returns keys in lexicographic order and ours are uuids, so the ordering
 * that comes back is effectively random — the sort here is what makes the
 * library show the thing you just uploaded at the top. One page of up to
 * `limit` is plenty for a media picker; there is no paging UI to drive more.
 */
export async function listMedia(limit = 200): Promise<MediaObject[]> {
  const response = await getClient().send(
    new ListObjectsV2Command({ Bucket: BUCKET, Prefix: MEDIA_PREFIX, MaxKeys: 1000 })
  );

  return (response.Contents ?? [])
    .filter((object): object is typeof object & { Key: string } => Boolean(object.Key))
    // A "directory marker" is a zero-byte object ending in / — not an image.
    .filter((object) => !object.Key.endsWith("/"))
    .sort((a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0))
    .slice(0, limit)
    .map((object) => ({
      key: object.Key,
      url: publicUrl(object.Key),
      size: object.Size ?? 0,
      uploadedAt: (object.LastModified ?? new Date(0)).toISOString(),
    }));
}

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return publicUrl(key);
}

/**
 * The same, for something nobody outside the admin may read.
 *
 * `private` and `no-store` rather than the immutable public header above: these
 * objects are somebody's identity documents, and the difference between the two
 * functions is the difference between a logo and a passport photograph. The key
 * is unguessable either way, but "unguessable" is not a permission model —
 * nothing ever hands out the URL, and the only way to read one is through an
 * authenticated route.
 */
export async function uploadPrivateObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "private, no-store",
    })
  );
}

/** The bytes of one object, for streaming back through an authed route. */
export async function getObject(
  key: string
): Promise<{ body: Uint8Array; contentType: string } | null> {
  try {
    const result = await getClient().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const body = await result.Body?.transformToByteArray();
    if (!body) return null;

    return { body, contentType: result.ContentType ?? "application/octet-stream" };
  } catch {
    // A missing key is a 404 to the caller, not a 500 — an entry can outlive
    // its file if somebody has been into the bucket by hand.
    return null;
  }
}

/**
 * Removes objects, in batches of the thousand the API allows.
 *
 * Needed the moment attachments exist: deleting a form cascades its entries in
 * Postgres, and without this the bucket would go on holding the licence scans
 * of everyone who ever entered it — with the only record of which files those
 * were sitting in the rows that were just deleted.
 */
export async function deleteObjects(keys: string[]): Promise<void> {
  const wanted = keys.filter(Boolean);
  if (wanted.length === 0) return;

  for (let from = 0; from < wanted.length; from += 1000) {
    await getClient().send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: { Objects: wanted.slice(from, from + 1000).map((Key) => ({ Key })) },
      })
    );
  }
}
