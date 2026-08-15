import { NextResponse } from "next/server";
import { articlePage, isArticleId } from "@/lib/articles";
import { folderForArticle } from "@/lib/mediaPaths";
import { guardAnyPage, guardArticle } from "@/lib/server/access";
import { deleteArticle, getArticle, updateArticle } from "@/lib/server/articlesRepo";
import { deleteEntityFolder, moveEntityFolder } from "@/lib/server/entityMedia";
import { revalidateArticlePages } from "@/lib/server/revalidateArticles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Postgres' unique violation, and the code updateArticle throws for a held address. */
const DUPLICATE = "23505";

type Params = { params: Promise<{ id: string }> };

/**
 * ── Why these routes guard TWICE, and why the first one is here ───────────
 *
 * Which account may touch an article depends on the page it is on, and that is
 * not known until the row has been read. Guarding only after the read would mean
 * a signed-out request reaching the database and getting a 404 that tells it
 * whether an id exists — the wrong order, and not what any other route here does.
 *
 * So the OUTER door is `guardAnyPage`, answered before anything else happens: a
 * signed-out request and a registrations admin never get as far as a query. The
 * INNER door is `guardArticle`, answered once the row's page is known. It is the
 * same arrangement the media library uses, for the same reason — see the note on
 * `guardAnyPage` in src/lib/server/access.ts.
 */
export async function PUT(request: Request, { params }: Params) {
  const denied = await guardAnyPage();
  if (denied) return denied;

  const { id } = await params;
  if (!isArticleId(id)) {
    return NextResponse.json({ error: "No such article." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = (body as { title?: unknown })?.title;
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }

  let before: Awaited<ReturnType<typeof getArticle>>;
  try {
    // Read before the guard: the guard's question is "may you touch THIS
    // article", and the answer depends on the page it is on right now.
    before = await getArticle(id);
  } catch (error) {
    console.error("[admin/articles] PUT read", error);
    return NextResponse.json({ error: "Could not save the article." }, { status: 500 });
  }

  if (!before) {
    return NextResponse.json({ error: "No such article." }, { status: 404 });
  }

  /*
   * TWO guards, and both are load-bearing.
   *
   * The first asks whether this account may touch the article AS IT STANDS. The
   * second asks whether it may put it WHERE IT IS ASKING. Dropping either one
   * opens a hole in the opposite direction: with only the second, a circuits
   * editor takes over an INCRC article by claiming it as their own; with only the
   * first, they push their own article onto a page they do not administer. Moving
   * an article between two pages is an edit to both of them.
   */
  const stayed = await guardArticle(before.page);
  if (stayed) return stayed;

  const wanted = articlePage((body as { page?: unknown })?.page);
  const moving = await guardArticle(wanted);
  if (moving) return moving;

  try {
    const notes: string[] = [];
    const article = await updateArticle(id, body, notes);
    if (!article) {
      return NextResponse.json({ error: "No such article." }, { status: 404 });
    }

    /*
     * The pictures follow the address AND the page.
     *
     * An article's folder is named after both — `incrc/articles/<slug>` — so
     * either changing leaves a folder behind, and the rows pointing into it have
     * to be re-addressed in the same breath. That second half is what decks does
     * not have to think about, because a deck cannot change page.
     *
     * Never fatal. The row is already written; answering 500 here would tell the
     * writer their article was lost when it was not.
     */
    const from = folderForArticle(before.page, before.slug, id);
    const to = folderForArticle(article.page, article.slug, id);

    let moved = false;
    if (before.slug && from !== to) {
      try {
        await moveEntityFolder(from, to);
        moved = true;
      } catch (error) {
        console.error("[admin/articles] folder move", error);
        notes.push(
          "The article's pictures could not be moved to the new address. They still work where they are."
        );
      }
    }

    /*
     * Read back after a move, and ONLY after a move.
     *
     * `updateArticle` writes the body the browser sent, whose inline images still
     * name the OLD folder, and the move then rewrites those same rows. Returning
     * the article as `updateArticle` built it would hand the editor addresses that
     * no longer exist — and because the editor keeps that copy as `saved`, the
     * very next save would write them back over the rewritten ones and undo the
     * move.
     */
    const fresh = moved ? ((await getArticle(id)) ?? article) : article;

    revalidateArticlePages([fresh.slug, before.slug]);
    return NextResponse.json({ article: fresh, notes });
  } catch (error) {
    if ((error as { code?: string })?.code === DUPLICATE) {
      return NextResponse.json(
        { error: "That address still belongs to another article." },
        { status: 409 }
      );
    }

    console.error("[admin/articles] PUT", error);
    return NextResponse.json({ error: "Could not save the article." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  // The outer door. See the note on PUT.
  const denied = await guardAnyPage();
  if (denied) return denied;

  const { id } = await params;
  if (!isArticleId(id)) {
    return NextResponse.json({ error: "No such article." }, { status: 404 });
  }

  let before: Awaited<ReturnType<typeof getArticle>>;
  try {
    before = await getArticle(id);
  } catch (error) {
    console.error("[admin/articles] DELETE read", error);
    return NextResponse.json({ error: "Could not delete the article." }, { status: 500 });
  }

  if (!before) {
    return NextResponse.json({ error: "No such article." }, { status: 404 });
  }

  // The inner door. The page it is on decides who may remove it — one check
  // here, because a delete has no "where to" to ask about.
  const refused = await guardArticle(before.page);
  if (refused) return refused;

  try {
    const removed = await deleteArticle(id);
    if (!removed) {
      return NextResponse.json({ error: "No such article." }, { status: 404 });
    }

    /*
     * The folder goes with the article — AFTER the row, never before.
     *
     * That order is what makes the usage scan inside mean what it says: with the
     * article already deleted, every reference still found is by definition a
     * reference from somewhere else, and those files are moved to the shared
     * folder rather than removed.
     */
    const notes: string[] = [];
    if (before.slug) {
      try {
        const { deleted, rescued } = await deleteEntityFolder(
          folderForArticle(before.page, before.slug, id)
        );

        if (rescued > 0) {
          notes.push(
            rescued === 1
              ? `One of its pictures is used elsewhere on the site and was moved to the shared uploads folder. ${deleted} were removed.`
              : `${rescued} of its pictures are used elsewhere on the site and were moved to the shared uploads folder. ${deleted} were removed.`
          );
        }
      } catch (error) {
        // Includes a usage scan that could not run. Deleting nothing is the right
        // answer to not knowing what is referenced.
        console.error("[admin/articles] folder delete", error);
        notes.push("Its pictures could not be tidied up and are still in the media library.");
      }
    }

    revalidateArticlePages([before.slug, ...before.former_slugs]);
    return NextResponse.json({ ok: true, notes });
  } catch (error) {
    console.error("[admin/articles] DELETE", error);
    return NextResponse.json({ error: "Could not delete the article." }, { status: 500 });
  }
}
