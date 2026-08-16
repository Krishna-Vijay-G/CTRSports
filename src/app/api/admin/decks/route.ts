import { NextResponse } from "next/server";
import { isDeckId } from "@/lib/decks";
import { guardRequestSite } from "@/lib/server/access";
import { createDeck, listDecks, reorderDecks } from "@/lib/server/decksRepo";
import { revalidateDeckPages } from "@/lib/server/revalidateDecks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Postgres' unique violation. The slug is the only unique column here. */
const DUPLICATE = "23505";

/** The whole list. */
export async function GET(request: Request) {
  const guard = await guardRequestSite(request, "decks");
  if (guard.denied) return guard.denied;

  try {
    return NextResponse.json({ decks: await listDecks(guard.site.id) });
  } catch (error) {
    console.error("[admin/decks] GET", error);
    return NextResponse.json({ error: "Could not load the decks." }, { status: 500 });
  }
}

/** Adds one. A deck with no name is not a deck, so that is the only rule. */
export async function POST(request: Request) {
  const guard = await guardRequestSite(request, "decks");
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
    // Anything the normaliser had to change comes back with the deck, the way
    // the forms route does it: an address rewritten behind a "Saved" badge is
    // how a printed link stops working without anybody noticing.
    const notes: string[] = [];
    const deck = await createDeck(guard.site.id, body, notes);

    revalidateDeckPages(guard.site, [deck.slug]);
    return NextResponse.json({ deck, notes });
  } catch (error) {
    if ((error as { code?: string })?.code === DUPLICATE) {
      return NextResponse.json({ error: "That address is already in use." }, { status: 409 });
    }

    console.error("[admin/decks] POST", error);
    return NextResponse.json({ error: "Could not save the deck." }, { status: 500 });
  }
}

/**
 * Sets the order of the whole list from an array of ids.
 *
 * A method on the collection rather than a /decks/reorder route, for the reason
 * the other collections give: a static sibling of [id] does not reliably win
 * the match, so the path would land in the [id] handler.
 */
export async function PATCH(request: Request) {
  const guard = await guardRequestSite(request, "decks");
  if (guard.denied) return guard.denied;

  let ids: unknown;
  try {
    ids = (await request.json())?.ids;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!Array.isArray(ids) || !ids.every(isDeckId)) {
    return NextResponse.json({ error: "Expected a list of deck ids." }, { status: 400 });
  }

  if (new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "The same deck was listed twice." }, { status: 400 });
  }

  try {
    await reorderDecks(ids);
    revalidateDeckPages(guard.site);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/decks] PATCH", error);
    return NextResponse.json({ error: "Could not save the new order." }, { status: 500 });
  }
}
