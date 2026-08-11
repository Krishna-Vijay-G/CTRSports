import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isS3Configured, listMedia } from "@/lib/server/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Everything this site has ever uploaded, newest first — the media library the
 * image picker browses.
 *
 * An unconfigured bucket is a 200 with an empty list plus `configured: false`,
 * not an error: the picker uses that to explain itself rather than showing a
 * failure for something that was never set up.
 */
export async function GET() {
  if (!(await getSession())) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  if (!isS3Configured()) {
    return NextResponse.json({ configured: false, media: [] });
  }

  try {
    return NextResponse.json({ configured: true, media: await listMedia() });
  } catch (error) {
    console.error("[admin/media]", error);
    return NextResponse.json({ error: "Could not list the media bucket." }, { status: 500 });
  }
}
