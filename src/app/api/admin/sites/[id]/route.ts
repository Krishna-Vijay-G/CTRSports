import { NextResponse } from "next/server";
import { guardSites } from "@/lib/server/access";
import { deleteSite, getSiteById, updateSite } from "@/lib/server/sitesRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/**
 * One sport. Owner only.
 *
 * The slug is deliberately absent from the update. Renaming a sport's ADDRESS
 * would move its media folder, change every URL it serves and invalidate every
 * stored link that resolved through it — and unlike a deck rename there is no
 * redirect table for sites, by the decision recorded in docs/multi-sport.md.
 * That is a migration, not a form field.
 */
export async function PUT(request: Request, { params }: Params) {
  const denied = await guardSites();
  if (denied) return denied;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, status, accent, modules } = (body ?? {}) as Record<string, unknown>;

  try {
    const site = await updateSite(id, {
      name: typeof name === "string" ? name : "",
      status: typeof status === "string" ? status : "draft",
      accent: typeof accent === "string" ? accent : "",
      modules,
    });

    if (!site) return NextResponse.json({ error: "No such sport." }, { status: 404 });
    return NextResponse.json({ site });
  } catch (error) {
    console.error("[admin/sites] PUT", error);
    return NextResponse.json({ error: "Could not save the sport." }, { status: 500 });
  }
}

/**
 * Deletes a sport and everything on it.
 *
 * Every foreign key into a site cascades, so this takes its pages, sections,
 * banners, decks, forms, articles, circuits, addresses and access grants with
 * it. There is no undo and no soft-delete — which is why the screen asks twice
 * and makes the person type the slug.
 *
 * The media folder is NOT removed here. That is the ordering `entityMedia` uses
 * everywhere: the row first, then the files, so a usage scan afterwards sees
 * only foreign references. Phase 6 wires the second half up; until then a
 * deleted sport leaves its folder behind, which is recoverable and the other
 * way round is not.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const denied = await guardSites();
  if (denied) return denied;

  const { id } = await params;

  try {
    const site = await getSiteById(id);
    if (!site) return NextResponse.json({ error: "No such sport." }, { status: 404 });

    if (site.kind === "root") {
      return NextResponse.json(
        { error: "The landing page cannot be deleted — “/” has to resolve." },
        { status: 400 }
      );
    }

    const removed = await deleteSite(id);
    if (!removed) return NextResponse.json({ error: "No such sport." }, { status: 404 });

    return NextResponse.json({
      ok: true,
      notes: [`Its media folder “${site.slug}/” is still in the library.`],
    });
  } catch (error) {
    console.error("[admin/sites] DELETE", error);
    return NextResponse.json({ error: "Could not delete the sport." }, { status: 500 });
  }
}
