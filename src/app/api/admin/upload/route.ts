import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isS3Configured, uploadObject } from "@/lib/s3";
import { IMAGE_EXTENSIONS, MAX_IMAGE_BYTES } from "@/lib/mediaTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxied image upload. Kept for images because it works with no bucket CORS at
 * all; videos go direct to S3 via /api/admin/upload-url instead.
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

  let file: File | null = null;
  try {
    const form = await request.formData();
    const entry = form.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }

  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Unsupported image type. Use JPG, PNG, WebP, GIF or AVIF." },
      { status: 415 }
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Image is larger than 4 MB. Try a smaller file." },
      { status: 413 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const key = `ctrsports/media/${randomUUID()}.${extension}`;
    const url = await uploadObject(key, buffer, file.type);

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error("[admin/upload]", error);
    return NextResponse.json({ error: "Upload to storage failed." }, { status: 500 });
  }
}
