import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isS3Configured, uploadObject } from "@/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Vercel caps a serverless request body at ~4.5 MB; the client downscales before sending. */
const MAX_BYTES = 4 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function POST(request: Request) {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "Image storage is not configured. Paste an image URL instead." },
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

  const extension = EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Unsupported file type. Use JPG, PNG, WebP, GIF or AVIF." },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
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
