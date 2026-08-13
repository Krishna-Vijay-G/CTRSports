import { NextResponse } from "next/server";
import { isDeckId } from "@/lib/decks";
import { guardPage } from "@/lib/server/access";
import { deleteDeck, getDeck, updateDeck } from "@/lib/server/decksRepo";
import { revalidateDeckPages } from "@/lib/server/revalidateDecks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Postgres' unique violation, and the code updateDeck throws for a held address. */
const DUPLICATE = "23505";

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: Request, { params }: Params) {
  const denied = await guardPage("decks");
  if (denied) return denied;

  const { id } = await params;
  if (!isDeckId(id)) {
    return NextResponse.json({ error: "No such deck." }, { status: 404 });
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
    // Read the address it had BEFORE the write, so a rename clears the cached
    // copy sitting under the old one as well as the new. After the update that
    // address is only in `former_slugs`, and a stale page there would keep
    // serving the deck instead of redirecting.
    const before = await getDeck(id);

    const notes: string[] = [];
    const deck = await updateDeck(id, body, notes);
    if (!deck) {
      return NextResponse.json({ error: "No such deck." }, { status: 404 });
    }

    revalidateDeckPages([deck.slug, before?.slug ?? ""]);
    return NextResponse.json({ deck, notes });
  } catch (error) {
    if ((error as { code?: string })?.code === DUPLICATE) {
      return NextResponse.json(
        { error: "That address still belongs to another deck." },
        { status: 409 }
      );
    }

    console.error("[admin/decks] PUT", error);
    return NextResponse.json({ error: "Could not save the deck." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await guardPage("decks");
  if (denied) return denied;

  const { id } = await params;
  if (!isDeckId(id)) {
    return NextResponse.json({ error: "No such deck." }, { status: 404 });
  }

  try {
    // Same reason as the PUT: the addresses it answered to have to be cleared,
    // and after the delete there is nothing left to read them from.
    const before = await getDeck(id);

    const removed = await deleteDeck(id);
    if (!removed) {
      return NextResponse.json({ error: "No such deck." }, { status: 404 });
    }

    revalidateDeckPages(before ? [before.slug, ...before.former_slugs] : []);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/decks] DELETE", error);
    return NextResponse.json({ error: "Could not delete the deck." }, { status: 500 });
  }
}
