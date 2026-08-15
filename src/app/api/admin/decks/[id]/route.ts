import { NextResponse } from "next/server";
import { isDeckId } from "@/lib/decks";
import { folderForEntity } from "@/lib/mediaPaths";
import { guardPage } from "@/lib/server/access";
import { deleteDeck, getDeck, updateDeck } from "@/lib/server/decksRepo";
import { deleteEntityFolder, moveEntityFolder } from "@/lib/server/entityMedia";
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

    /*
     * The pictures follow the address. A deck's folder is named after its slug,
     * so an address that moves leaves a folder behind — and the rows pointing
     * into it have to be re-addressed in the same breath. See
     * src/lib/server/entityMedia.ts for why the order inside that is what it is.
     *
     * Never fatal. The row is already written; answering 500 here would tell the
     * editor their edit was lost when it was not. A folder left at the old
     * address is untidy, visible in the media library, and fixable.
     */
    let moved = false;
    if (before?.slug && before.slug !== deck.slug) {
      try {
        await moveEntityFolder(
          folderForEntity("decks", before.slug, id),
          folderForEntity("decks", deck.slug, id)
        );
        moved = true;
      } catch (error) {
        console.error("[admin/decks] folder move", error);
        notes.push(
          "The deck's pictures could not be moved to the new address. They still work where they are."
        );
      }
    }

    /*
     * Read back after a move, and ONLY after a move.
     *
     * `updateDeck` writes the page URLs the browser sent, which still name the
     * OLD folder, and the move then rewrites those same rows. Returning the deck
     * as `updateDeck` built it would hand the editor URLs that no longer exist —
     * and because the editor keeps that copy as `saved`, the very next save would
     * write them back over the rewritten ones and undo the move.
     */
    const fresh = moved ? ((await getDeck(id)) ?? deck) : deck;

    // After the move, so the rebuilt pages are built from the rewritten rows.
    revalidateDeckPages([fresh.slug, before?.slug ?? ""]);
    return NextResponse.json({ deck: fresh, notes });
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

    /*
     * The folder goes with the deck — AFTER the row, never before.
     *
     * That order is what makes the usage scan inside mean what it says: with the
     * deck and its pages already deleted, every reference still found is by
     * definition a reference from somewhere else, and those files are moved to
     * the shared folder rather than removed. No owner to exclude, and no chance
     * of excluding the wrong one.
     *
     * Not fatal, for the same reason as the PUT: the deck is gone either way.
     */
    const notes: string[] = [];
    if (before?.slug) {
      try {
        const { deleted, rescued } = await deleteEntityFolder(
          folderForEntity("decks", before.slug, id)
        );

        if (rescued > 0) {
          notes.push(
            rescued === 1
              ? `One of its pictures is used elsewhere on the site and was moved to the shared uploads folder. ${deleted} were removed.`
              : `${rescued} of its pictures are used elsewhere on the site and were moved to the shared uploads folder. ${deleted} were removed.`
          );
        }
      } catch (error) {
        // Includes a usage scan that could not run. Deleting nothing is the
        // right answer to not knowing what is referenced.
        console.error("[admin/decks] folder delete", error);
        notes.push("Its pictures could not be tidied up and are still in the media library.");
      }
    }

    revalidateDeckPages(before ? [before.slug, ...before.former_slugs] : []);
    return NextResponse.json({ ok: true, notes });
  } catch (error) {
    console.error("[admin/decks] DELETE", error);
    return NextResponse.json({ error: "Could not delete the deck." }, { status: 500 });
  }
}
