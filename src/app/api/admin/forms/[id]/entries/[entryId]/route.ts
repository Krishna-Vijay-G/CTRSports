import { NextResponse } from "next/server";
import { isFormId, validateSubmission, withOrphans } from "@/lib/forms";
import { guardFormById } from "@/lib/server/access";
import { deleteEntry, getEntry, updateEntry } from "@/lib/server/entriesRepo";
import { getForm } from "@/lib/server/formsRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string; entryId: string }> };

/**
 * Corrects one entry.
 *
 * A misheard phone number and a name spelled from a bad line are the ordinary
 * case for an entry list, and the alternative to correcting one is deleting it
 * and typing it again — which loses when it was made.
 *
 * The answers go through the same `validateSubmission` as everything else, so
 * an edit cannot put a shape into the table that the form itself could not
 * produce. What it must NOT do is save that output straight over the row: it
 * covers only the questions being asked now, and the entry may hold answers to
 * questions since deleted. `withOrphans` is what keeps those.
 */
export async function PUT(request: Request, { params }: Params) {
  const { id, entryId } = await params;

  const guard = await guardFormById(id);
  if (guard.denied) return guard.denied;
  if (!isFormId(id) || !isFormId(entryId)) {
    return NextResponse.json({ error: "No such entry." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That was not readable." }, { status: 400 });
  }

  try {
    const [form, existing] = await Promise.all([getForm(id), getEntry(id, entryId)]);

    if (!form || !existing) {
      return NextResponse.json({ error: "No such entry." }, { status: 404 });
    }

    /*
     * Validated against the day the entry was MADE, not today.
     *
     * A derived age is a fact about the day somebody entered — the whole reason
     * it is stored rather than worked out when the sheet is opened. Re-deriving
     * it against the current date meant that correcting a misspelled surname on
     * a two-year-old entry silently aged that person by two years, quietly
     * rewriting the column the export is read from. `withOrphans` could not
     * save it either: the age key is a current column, so the fresh value
     * always won.
     */
    const submittedAt = new Date(existing.created_at);
    const { values, errors } = validateSubmission(
      form.fields,
      (body as { values?: unknown })?.values,
      Number.isNaN(submittedAt.getTime()) ? new Date() : submittedAt,
      form.sections
    );

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ errors }, { status: 422 });
    }

    const entry = await updateEntry(id, entryId, withOrphans(existing.answers, values));
    if (!entry) {
      return NextResponse.json({ error: "No such entry." }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (error) {
    console.error("[admin/forms] entry PUT", error);
    return NextResponse.json({ error: "Could not save the entry." }, { status: 500 });
  }
}

/**
 * Removes one entry.
 *
 * Deleting is allowed because spam has to be removable — a table nobody can
 * tidy stops being read, and an entries screen nobody reads is worse than no
 * screen. Scoped by form as well as by entry in the repo, so a stray id cannot
 * reach across to another form's entries.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const { id, entryId } = await params;

  const guard = await guardFormById(id);
  if (guard.denied) return guard.denied;
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
