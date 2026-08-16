import { NextResponse } from "next/server";
import { fileOf, isFormId } from "@/lib/forms";
import { guardFormById } from "@/lib/server/access";
import { getEntry } from "@/lib/server/entriesRepo";
import { ENTRY_PREFIX, getObject } from "@/lib/server/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; entryId: string; fieldId: string }> };

/**
 * One attachment, streamed to somebody who is allowed to read it.
 *
 * These are licence scans, indemnity forms and photographs of named people, so
 * unlike every other upload in this project they are never public. The bucket
 * holds them under a separate prefix with a private cache header, no URL for
 * them is ever handed out, and this is the only way they come back — behind
 * `guardForms`, which is the same gate the entries themselves are behind.
 *
 * The key is NOT taken from the request. It is read out of the entry named in
 * the path, so the only files this can return are ones belonging to an entry on
 * a form the caller may already read. A route that took a key from a query
 * string would be a way to read any object in the bucket.
 */
export async function GET(_request: Request, { params }: Params) {
  const { id, entryId, fieldId } = await params;

  const guard = await guardFormById(id);
  if (guard.denied) return guard.denied;
  if (!isFormId(id) || !isFormId(entryId)) {
    return NextResponse.json({ error: "No such file." }, { status: 404 });
  }

  try {
    // Scoped by form as well as by entry, so an id from one form cannot reach
    // an entry on another.
    const entry = await getEntry(id, entryId);
    if (!entry) {
      return NextResponse.json({ error: "No such file." }, { status: 404 });
    }

    const file = fileOf(entry.answers[fieldId]);

    // And the key has to be one of ours: a stored answer is normalised, but
    // this is the check that makes that irrelevant.
    if (!file || !file.key.startsWith(`${ENTRY_PREFIX}${id}/`)) {
      return NextResponse.json({ error: "No such file." }, { status: 404 });
    }

    const object = await getObject(file.key);
    if (!object) {
      // The row outlived the object — somebody has been into the bucket by
      // hand. A 404 is the truth; a 500 would suggest this is fixable by
      // retrying.
      return NextResponse.json({ error: "That file is no longer stored." }, { status: 404 });
    }

    return new Response(new Uint8Array(object.body), {
      headers: {
        "content-type": object.contentType,
        // `inline` so a PDF or a photograph opens rather than downloads — an
        // admin checking a licence wants to look at it, not collect a folder of
        // files. The filename is sanitised at the point of use.
        "content-disposition": `inline; filename="${file.name.replace(/[^\w. -]/g, "").slice(0, 80) || "file"}"`,
        // Never in a shared cache, and never on disk longer than the tab.
        "cache-control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[admin/forms] attachment", error);
    return NextResponse.json({ error: "Could not open that file." }, { status: 500 });
  }
}
