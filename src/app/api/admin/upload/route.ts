import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  DEFAULT_UPLOAD_FOLDER,
  MEDIA_PREFIX,
  parseFolder,
  slugifyFileName,
} from "@/lib/mediaPaths";
import {
  MAX_SERVER_UPLOAD_BYTES,
  contentTypeFor,
  extensionFor,
  maxBytesForExtension,
  megabytes,
  unsupportedType,
} from "@/lib/media";
import { guardAnySite, guardFolder } from "@/lib/server/access";
import { isS3Configured, uploadObject } from "@/lib/server/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Takes one picture and puts it in the bucket, in the folder the screen asked for.
 *
 * ── Nothing in the admin calls this any more ──────────────────────────────
 *
 * It used to be the path every picture took: converted to WebP in the browser
 * (see src/lib/client/toWebp.ts), then POSTed here as form data. The trouble was
 * never the conversion, it was where the check sat — this route reads the whole
 * body into a serverless function, the platform refuses one over about four and
 * a half megabytes, and the ceiling written to match it was tested against the
 * file BEFORE conversion. So the thing that would have made a twelve-megabyte
 * photograph small never ran, and the upload was refused for a size it was
 * about to stop being.
 *
 * The admin signs a PUT and goes straight to S3 now, for pictures as well as
 * video — see src/lib/client/upload.ts — which removes the ceiling instead of
 * arguing with it. This route is kept because it is a working, authenticated,
 * folder-guarded upload endpoint and something outside the admin may be using
 * it; what it enforces is a transport limit and says so.
 *
 * The type table is shared with `/api/admin/upload/sign` rather than split, so
 * the two routes cannot quietly come to admit different things.
 *
 * ── The folder ────────────────────────────────────────────────────────────
 *
 * `folder` is a second form field, and a request without one still works — it
 * lands in the shared folder rather than failing, so a caller that never learns
 * about folders is degraded rather than broken. What it is NOT allowed to do is
 * name a folder belonging to a page this account cannot edit; `guardFolder`
 * answers that, and it is the only thing standing between a decks editor and
 * the landing page's pictures.
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

  let file: File | null = null;
  let asked: unknown = "";
  try {
    const form = await request.formData();
    const value = form.get("file");
    file = value instanceof File ? value : null;
    asked = form.get("folder") ?? "";
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file was sent." }, { status: 400 });
  }

  // An absent folder is the shared one, not the root: the root is where every
  // upload made before folders existed sits, and nothing new should join them.
  const folder = parseFolder(asked === "" ? DEFAULT_UPLOAD_FOLDER : asked);
  if (folder === null) {
    return NextResponse.json({ error: "That is not a folder." }, { status: 400 });
  }

  const refused = await guardFolder(folder, "write");
  if (refused) return refused;

  // The name is a fallback for a browser that could not name the type, never
  // an override of one it could. See `extensionFor`.
  const extension = extensionFor(file.type, file.name);
  if (!extension) {
    return NextResponse.json(
      { error: unsupportedType(file.type, file.name) },
      { status: 415 }
    );
  }

  /*
   * This route's ceiling, and it is about transport rather than about what a
   * file is. The bytes arrive as a request body through a serverless function,
   * and the platform refuses one over about four and a half megabytes before
   * this code runs at all, so pretending the type's own ceiling applies here
   * would mean promising something the function never gets to keep.
   *
   * Nothing in the admin posts here any more — every uploader signs a PUT and
   * sends the bytes straight to S3, which is what lifted the ceiling on
   * pictures. This is for callers outside it, and it exists so that one gets a
   * sentence instead of the platform's own HTML error page.
   */
  const cap = Math.min(maxBytesForExtension(extension), MAX_SERVER_UPLOAD_BYTES);
  if (file.size > cap) {
    return NextResponse.json(
      {
        error: `That file is larger than ${megabytes(
          cap
        )}, which is all this route can carry. Upload it straight to storage instead.`,
      },
      { status: 413 }
    );
  }

  try {
    /*
     * `<folder>/<readable-name>-<uuid>.<ext>`.
     *
     * A fresh uuid every time: objects are never overwritten, which is what
     * makes the immutable cache header on them honest, and what makes moving a
     * folder into one that already exists a merge rather than a collision.
     *
     * The name in front of it is the first caller `slugifyFileName` has ever
     * had, and it is what makes a folder of these readable rather than a wall
     * of uuids. It never decides the extension — that still comes from the MIME
     * type checked above, so a file called `x.png` that is really a PDF cannot
     * name itself a PNG.
     */
    const key = `${MEDIA_PREFIX}${folder}/${slugifyFileName(file.name)}-${randomUUID()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    // The canonical type for the extension, not whatever the browser called
    // it: an object stored with an empty or generic type plays nowhere.
    const url = await uploadObject(key, buffer, contentTypeFor(extension));

    // Additive. Every existing caller reads `url` and is unaffected.
    return NextResponse.json({ url, key, folder });
  } catch (error) {
    console.error("[admin/upload]", error);
    return NextResponse.json({ error: "Could not upload the file." }, { status: 500 });
  }
}
