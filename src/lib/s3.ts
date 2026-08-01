import "server-only";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export function isS3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET &&
      process.env.S3_REGION &&
      process.env.S3_ACCESS_KEY_ID &&
      process.env.S3_SECRET_ACCESS_KEY
  );
}

/**
 * Public URL for a stored object. Set S3_PUBLIC_BASE_URL when the bucket sits
 * behind CloudFront or a custom domain; otherwise the virtual-hosted S3 URL is used.
 */
export function publicUrl(key: string): string {
  const base = process.env.S3_PUBLIC_BASE_URL?.replace(/\/+$/, "");
  if (base) return `${base}/${key}`;
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

export async function uploadObject(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
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

export async function deleteObject(key: string): Promise<void> {
  await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
