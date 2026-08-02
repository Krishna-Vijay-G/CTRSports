import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createUploadUrl, isS3Configured } from "@/lib/s3";
import { MAX_VIDEO_BYTES, extensionFor, isVideoType } from "@/lib/mediaTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Hands back a short-lived presigned PUT so the browser can upload straight to
 * S3. Used for videos, which are far too large to proxy through a route handler.
 */
export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "Media storage is not configured. Paste a media URL instead." },
      { status: 503 }
    );
  }

  let body: { contentType?: unknown; size?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const contentType = typeof body.contentType === "string" ? body.contentType : "";
  const extension = extensionFor(contentType);

  if (!extension) {
    return NextResponse.json({ error: "Unsupported file type." }, { status: 415 });
  }

  const size = typeof body.size === "number" ? body.size : 0;
  if (isVideoType(contentType) && size > MAX_VIDEO_BYTES) {
    return NextResponse.json(
      { error: `Video is larger than ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB.` },
      { status: 413 }
    );
  }

  try {
    const key = `ctrsports/media/${randomUUID()}.${extension}`;
    const { uploadUrl, publicUrl } = await createUploadUrl(key, contentType);
    return NextResponse.json({ uploadUrl, url: publicUrl, key });
  } catch (error) {
    console.error("[admin/upload-url]", error);
    return NextResponse.json({ error: "Could not prepare the upload." }, { status: 500 });
  }
}
