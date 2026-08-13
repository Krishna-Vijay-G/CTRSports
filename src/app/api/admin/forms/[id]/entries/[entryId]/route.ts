import { NextResponse } from "next/server";
import { isFormId } from "@/lib/forms";
import { guardForms } from "@/lib/server/access";
import { deleteEntry } from "@/lib/server/entriesRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; entryId: string }> };

/**
 * Removes one entry.
 *
 * Deleting is allowed because spam has to be removable — a table nobody can
 * tidy stops being read, and an entries screen nobody reads is worse than no
 * screen. Scoped by form as well as by entry in the repo, so a stray id cannot
 * reach across to another form's entries.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const denied = await guardForms();
  if (denied) return denied;

  const { id, entryId } = await params;
  if (!isFormId(id) || !isFormId(entryId)) {
    return NextResponse.json({ error: "No such entry." }, { status: 404 });
  }

  try {
    const gone = await deleteEntry(id, entryId);
    if (!gone) {
      return NextResponse.json({ error: "No such entry." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/forms] entry DELETE", error);
    return NextResponse.json({ error: "Could not delete the entry." }, { status: 500 });
  }
}
