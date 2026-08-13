import { NextResponse } from "next/server";
import { isFormId } from "@/lib/forms";
import { visibleFormPages } from "@/lib/roles";
import { guardForms, guardFormsRead } from "@/lib/server/access";
import { getSession } from "@/lib/server/auth";
import { createForm, listForms, reorderForms } from "@/lib/server/formsRepo";
import { revalidateFormPages } from "@/lib/server/revalidateForms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Postgres' unique violation. The slug is the only unique column here. */
const DUPLICATE = "23505";

/**
 * The forms.
 *
 * GET is the wide one: a page editor can read the list, because pointing a
 * button at a form is the whole of what they do with one — and it comes back
 * narrowed to the pages they edit, so one page's picker never lists another
 * page's entry form. Everything that WRITES is registrations and owners only.
 */

export async function GET() {
  const denied = await guardFormsRead();
  if (denied) return denied;

  try {
    const forms = await listForms();
    const session = await getSession();
    const allowed = visibleFormPages(session);

    // An owner or a registrations admin gets everything, including the forms
    // on no page at all. Anyone else gets their own pages and nothing else.
    const mine =
      session && (session.role === "owner" || session.role === "registrations")
        ? forms
        : forms.filter((form) => form.page_key !== "" && allowed.includes(form.page_key));

    return NextResponse.json({ forms: mine });
  } catch (error) {
    console.error("[admin/forms] GET", error);
    return NextResponse.json({ error: "Could not load the forms." }, { status: 500 });
  }
}

/** Adds one. A form with no name is not a form, so that is the only rule. */
export async function POST(request: Request) {
  const denied = await guardForms();
  if (denied) return denied;

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
    const form = await createForm(body);
    revalidateFormPages();
    return NextResponse.json({ form });
  } catch (error) {
    if ((error as { code?: string })?.code === DUPLICATE) {
      return NextResponse.json({ error: "That link is already in use." }, { status: 409 });
    }

    console.error("[admin/forms] POST", error);
    return NextResponse.json({ error: "Could not save the form." }, { status: 500 });
  }
}

/**
 * Sets the order of the whole list from an array of ids.
 *
 * A method on the collection rather than a /forms/reorder route, for the reason
 * the other collections give: a static sibling of [id] does not reliably win
 * the match, so the path would land in the [id] handler.
 */
export async function PATCH(request: Request) {
  const denied = await guardForms();
  if (denied) return denied;

  let ids: unknown;
  try {
    ids = (await request.json())?.ids;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(ids) || !ids.every(isFormId)) {
    return NextResponse.json({ error: "Expected a list of form ids." }, { status: 400 });
  }

  if (new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "The same form was listed twice." }, { status: 400 });
  }

  try {
    await reorderForms(ids);
    revalidateFormPages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/forms] PATCH", error);
    return NextResponse.json({ error: "Could not save the new order." }, { status: 500 });
  }
}
