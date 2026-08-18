import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { DEFAULT_UPLOAD_FOLDER, MEDIA_PREFIX, parseFolder, slugifyFileName } from "@/lib/mediaPaths";
import {
  POSTER_EXTENSION,
  UNSUPPORTED_TYPE,
  UPLOAD_TYPES,
  isVideoType,
  maxBytesFor,
  megabytes,
  posterKeyFor,
} from "@/lib/media";
import { guardAnySite, guardFolder } from "@/lib/server/access";
import { isS3Configured, presignUpload, publicUrl } from "@/lib/server/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Signs a PUT so the browser can send a file straight to S3.
 *
 * ── Why nothing uses the ordinary upload route ────────────────────────────
 *
 * That route reads the whole file into a serverless function's memory as form
 * data, and the platform this deploys to refuses a request body over about four
 * and a half megabytes. No amount of raising a constant changes that, because
 * the limit is in front of the function.
 *
 * It was a video that could not fit first, and for a while pictures went the
 * other way on the argument that they arrive converted and small. They do — but
 * the check that enforced it ran on the file BEFORE conversion, so a twelve-
 * megabyte phone photograph was refused for being too big to send, having never
 * been made small. Both kinds come here now, and the ceiling on a picture is
 * gone rather than raised.
 *
 * So the bytes never touch a server. This route decides WHERE the file may go
 * and WHAT it may be, and hands back a signature that is good for one key, one
 * content type and sixty seconds.
 *
 * ── What is still enforced, and what is not ───────────────────────────────
 *
 *   the folder     `guardFolder` — a decks co-admin cannot sign a key under
 *                  another sport's folder, which is the only thing standing
 *                  between them and its pictures.
 *   the type       the signature pins the content type, so the PUT that follows
 *                  cannot upload something else under a name this route chose.
 *   the extension  from the MIME type, never from the file's name.
 *   the size       nothing at all, for a picture — there is no ceiling on one
 *                  any more; see src/lib/media.ts. A video is still held to
 *                  200 MB, from the size the caller DECLARES, and a presigned
 *                  PUT does not enforce that, so an authenticated admin could
 *                  send more than they said. Accepted — the caller is a trusted
 *                  admin, not the public — and `@aws-sdk/s3-presigned-post` has
 *                  a `content-length-range` condition if it ever stops being.
 *
 * ── The poster ────────────────────────────────────────────────────────────
 *
 * A video comes back with a SECOND signature, for a JPEG at the same key with
 * the extension swapped. That is where `posterFor` looks, so the pair has to be
 * minted together — the browser cannot invent the uuid and the route cannot
 * capture the frame. Uploading the poster is optional: a browser that could not
 * decode the video simply does not use the second signature, and the video
 * falls back to its first frame.
 */
export async function POST(request: Request) {
  const denied = await guardAnySite();
  if (denied) return denied;

  if (!isS3Configured()) {
    return NextResponse.json(
      { error: "Media storage is not configured. Paste a URL instead." },
      { status: 503 }
    );
  }

  let body: { folder?: unknown; name?: unknown; type?: unknown; size?: unknown };
  try {
    body = (await request.json()) ?? {};
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const type = typeof body.type === "string" ? body.type : "";
  const extension = UPLOAD_TYPES[type];
  if (!extension) {
    return NextResponse.json({ error: UNSUPPORTED_TYPE }, { status: 415 });
  }

  const size = typeof body.size === "number" && Number.isFinite(body.size) ? body.size : 0;
  const cap = maxBytesFor(type);
  if (size > cap) {
    return NextResponse.json(
      { error: `That file is larger than ${megabytes(cap)}.` },
      { status: 413 }
    );
  }

  // An absent folder is the shared one, not the root: the root is where every
  // upload made before folders existed sits, and nothing new should join them.
  const asked = typeof body.folder === "string" ? body.folder : "";
  const folder = parseFolder(asked === "" ? DEFAULT_UPLOAD_FOLDER : asked);
  if (folder === null) {
    return NextResponse.json({ error: "That is not a folder." }, { status: 400 });
  }

  const refused = await guardFolder(folder, "write");
  if (refused) return refused;

  try {
    const name = slugifyFileName(typeof body.name === "string" ? body.name : "");
    const key = `${MEDIA_PREFIX}${folder}/${name}-${randomUUID()}.${extension}`;
    const signed = await presignUpload(key, type);

    const poster = isVideoType(type)
      ? await (async () => {
          const posterKey = posterKeyFor(key);
          const signedPoster = await presignUpload(posterKey, "image/jpeg");
          return { key: posterKey, url: publicUrl(posterKey), ...signedPoster };
        })()
      : null;

    return NextResponse.json({
      key,
      url: publicUrl(key),
      uploadUrl: signed.uploadUrl,
      headers: signed.headers,
      folder,
      ...(poster ? { poster } : {}),
    });
  } catch (error) {
    console.error("[admin/upload/sign]", error);
    return NextResponse.json({ error: "Could not start the upload." }, { status: 500 });
  }
}
