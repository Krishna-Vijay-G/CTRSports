import { NextResponse } from "next/server";
import { isFormId } from "@/lib/forms";
import { guardForms } from "@/lib/server/access";
import { deleteForm, updateForm } from "@/lib/server/formsRepo";
import { revalidateFormPages } from "@/lib/server/revalidateForms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Postgres' unique violation. The slug is the only unique column here. */
const DUPLICATE = "23505";

export async function PUT(request: Request, { params }: Params) {
  const denied = await guardForms();
  if (denied) return denied;

  const { id } = await params;
  // Reject a non-uuid here rather than let Postgres reject it as a type error,
  // which would surface as a 500.
  if (!isFormId(id)) {
    return NextResponse.json({ error: "No such form." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = (body as { name?: unknown })?.name;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "A name is required." }, { status: 400 });
  }

  try {
    const form = await updateForm(id, body);
    if (!form) {
      return NextResponse.json({ error: "No such form." }, { status: 404 });
    }

    revalidateFormPages();
    return NextResponse.json({ form });
  } catch (error) {
    if ((error as { code?: string })?.code === DUPLICATE) {
      return NextResponse.json({ error: "That link is already in use." }, { status: 409 });
    }

    console.error("[admin/forms] PUT", error);
    return NextResponse.json({ error: "Could not save the form." }, { status: 500 });
  }
}

/**
 * Deletes the form AND every entry on it — the foreign key is ON DELETE
 * CASCADE. The screen counts the entries into its confirmation for that reason.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const denied = await guardForms();
  if (denied) return denied;

  const { id } = await params;
  if (!isFormId(id)) {
    return NextResponse.json({ error: "No such form." }, { status: 404 });
  }

  try {
    const gone = await deleteForm(id);
    if (!gone) {
      return NextResponse.json({ error: "No such form." }, { status: 404 });
    }

    revalidateFormPages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/forms] DELETE", error);
    return NextResponse.json({ error: "Could not delete the form." }, { status: 500 });
  }
}
