import { NextResponse } from "next/server";
import { isFormId } from "@/lib/forms";
import { siteIdsFor } from "@/lib/roles";
import { guardAnySite, guardRequestSite } from "@/lib/server/access";
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
 * GET is the wide one: anyone with any grant can read the list, because
 * pointing a button at a form is the whole of what a page editor does with one
 * — and it comes back narrowed to the sports they hold, so one sport's picker
 * never lists another sport's entry form. Everything that WRITES needs the
 * `forms` module on the sport it is writing to.
 *
 * The old `registrations` role — every form on every page, and nothing else —
 * has no equivalent and needs none: the same reach is a `forms` grant on each
 * site, which migration 0013 wrote for any account that had it.
 */

export async function GET(request: Request) {
  const denied = await guardAnySite();
  if (denied) return denied;

  try {
    const session = await getSession();

    /*
     * `siteIdsFor` returns null for an owner, meaning "every site", which is
     * exactly what `listForms` wants for its no-filter case. The narrowing is a
     * WHERE rather than a filter on the way out, so a scoped account never pays
     * for rows it may not see and they never leave Postgres.
     */
    const wanted = new URL(request.url).searchParams.get("site")?.trim() ?? "";

    if (wanted) {
      const guard = await guardRequestSite(request, "forms");
      if (guard.denied) return guard.denied;
      return NextResponse.json({ forms: await listForms([guard.site.id]) });
    }

    return NextResponse.json({ forms: await listForms(siteIdsFor(session)) });
  } catch (error) {
    console.error("[admin/forms] GET", error);
    return NextResponse.json({ error: "Could not load the forms." }, { status: 500 });
  }
}

/** Adds one. A form with no name is not a form, so that is the only rule. */
export async function POST(request: Request) {
  const guard = await guardRequestSite(request, "forms");
  if (guard.denied) return guard.denied;

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
    // Anything the normaliser had to change comes back with the form. A rule
    // dropped or an address rewritten used to happen in total silence, behind a
    // "Saved" badge — the admin's next clue was a question that had stopped
    // appearing on the live site.
    const notes: string[] = [];
    const form = await createForm(guard.site.id, body, notes);

    revalidateFormPages(guard.site);
    return NextResponse.json({ form, notes });
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
  const guard = await guardRequestSite(request, "forms");
  if (guard.denied) return guard.denied;

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
    revalidateFormPages(guard.site);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/forms] PATCH", error);
    return NextResponse.json({ error: "Could not save the new order." }, { status: 500 });
  }
}
