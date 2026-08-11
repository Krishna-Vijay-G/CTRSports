import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isS3Configured, uploadObject } from "@/lib/server/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Takes one logo and puts it in the bucket.
 *
 * The browser has already converted it to WebP and capped its longest edge
 * (see src/lib/client/toWebp.ts), so anything arriving here is small. The size
 * ceiling below is a backstop against a caller that skipped that step, not the
 * expected path.
 */
const MAX_BYTES = 4 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/svg+xml": "svg",
};

export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "Image storage is not configured. Paste a logo URL instead." },
      { status: 503 }
    );
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const value = form.get("file");
    file = value instanceof File ? value : null;
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file was sent." }, { status: 400 });
  }

  const extension = EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Unsupported file type. Use WebP, PNG, JPEG or SVG." },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image is larger than ${Math.round(MAX_BYTES / 1024 / 1024)} MB.` },
      { status: 413 }
    );
  }

  try {
    const key = `ctrsports/logos/${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadObject(key, buffer, file.type);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("[admin/upload]", error);
    return NextResponse.json({ error: "Could not upload the image." }, { status: 500 });
  }
}
