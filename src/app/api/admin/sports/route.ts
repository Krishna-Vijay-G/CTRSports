import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { guardRootSite } from "@/lib/server/access";
import { createSport, listAllSports, reorderSports } from "@/lib/server/sportsRepo";
import { isSportId } from "@/lib/sports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The whole list, hidden cards included. */
export async function GET() {
  const guard = await guardRootSite("page");
  if (guard.denied) return guard.denied;

  try {
    return NextResponse.json({ sports: await listAllSports() });
  } catch (error) {
    console.error("[admin/sports] GET", error);
    return NextResponse.json({ error: "Could not load the sports." }, { status: 500 });
  }
}

/** Adds one. A card with no title is not a card, so that is the only hard rule. */
export async function POST(request: Request) {
  const guard = await guardRootSite("page");
  if (guard.denied) return guard.denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = (body as { title?: unknown })?.title;
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  try {
    const sport = await createSport(body);
    revalidatePath("/");
    return NextResponse.json({ sport });
  } catch (error) {
    console.error("[admin/sports] POST", error);
    return NextResponse.json({ error: "Could not save the sport." }, { status: 500 });
  }
}

/**
 * Sets the order of the whole list from an array of ids.
 *
 * This is a method on the collection rather than a /sports/reorder route on
 * purpose: a static sibling of [id] does NOT reliably win the match here, so
 * /sports/reorder ends up in the [id] handler and tries to operate on a sport
 * called "reorder". A distinct verb on the collection cannot collide.
 */
export async function PATCH(request: Request) {
  const guard = await guardRootSite("page");
  if (guard.denied) return guard.denied;

  let ids: unknown;
  try {
    ids = (await request.json())?.ids;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(ids) || !ids.every(isSportId)) {
    return NextResponse.json({ error: "Expected a list of sport ids." }, { status: 400 });
  }

  if (new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "The same sport was listed twice." }, { status: 400 });
  }

  try {
    await reorderSports(ids);
    revalidatePath("/");
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/sports] PATCH", error);
    return NextResponse.json({ error: "Could not save the new order." }, { status: 500 });
  }
}
