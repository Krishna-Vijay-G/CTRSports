import { NextResponse } from "next/server";
import { articlePage, isArticleId } from "@/lib/articles";
import { guardAnyPage, guardArticle } from "@/lib/server/access";
import { createArticle, listArticles, reorderArticles } from "@/lib/server/articlesRepo";
import { getSession } from "@/lib/server/auth";
import { revalidateArticlePages } from "@/lib/server/revalidateArticles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The collection. Listing, adding and ordering.
 *
 * ── Why the reorder is a PATCH here and not a route of its own ────────────
 *
 * `/api/admin/articles/reorder` would be a static sibling of `[id]`, and a static
 * sibling does not reliably win the route match — the request lands in the `[id]`
 * handler with `id` set to the string "reorder". Decks and tracks both learned
 * this; the README records it. Ordering is a property OF the collection, so PATCH
 * on the collection is also the more honest verb.
 *
 * ── Who may do what ───────────────────────────────────────────────────────
 *
 * The list is narrowed in SQL to the pages this account holds, so a page editor's
 * payload never contains an article they cannot open. Writing asks `guardArticle`,
 * which reads a null page as "the whole site" and therefore as owner-only.
 */

const DUPLICATE = "23505";

export async function GET() {
  const denied = await guardAnyPage();
  if (denied) return denied;

  try {
    // Non-null: guardAnyPage already refused a request with no session.
    const session = (await getSession())!;
    return NextResponse.json({ articles: await listArticles(session) });
  } catch (error) {
    console.error("[admin/articles] GET", error);
    return NextResponse.json({ error: "Could not load the articles." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // The outer door, answered before a stranger's body is even read. The inner
  // one below needs the page, and the page is in that body.
  const shut = await guardAnyPage();
  if (shut) return shut;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  /*
   * The page decides the guard, so it is read before anything is written. An
   * unrecognised value reads as null — every page — which is the STRICTEST
   * answer and takes an owner. A page editor cannot widen their reach by sending
   * a page key that does not exist.
   */
  const denied = await guardArticle(articlePage((body as { page?: unknown })?.page));
  if (denied) return denied;

  const title = (body as { title?: unknown })?.title;
  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "A title is required." }, { status: 400 });
  }

  try {
    const notes: string[] = [];
    const article = await createArticle(body, notes);
    revalidateArticlePages([article.slug]);
    return NextResponse.json({ article, notes });
  } catch (error) {
    if ((error as { code?: string })?.code === DUPLICATE) {
      return NextResponse.json({ error: "That address is already in use." }, { status: 409 });
    }

    console.error("[admin/articles] POST", error);
    return NextResponse.json({ error: "Could not save the article." }, { status: 500 });
  }
}

/** `{ ids: string[] }` — the whole list, in the order it should be in. */
export async function PATCH(request: Request) {
  const denied = await guardAnyPage();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ids = (body as { ids?: unknown })?.ids;
  if (!Array.isArray(ids) || !ids.every(isArticleId)) {
    return NextResponse.json({ error: "Expected a list of article ids." }, { status: 400 });
  }

  if (new Set(ids).size !== ids.length) {
    return NextResponse.json({ error: "The same article was listed twice." }, { status: 400 });
  }

  try {
    const session = (await getSession())!;

    /*
     * Every id has to be one this account may edit.
     *
     * Unlike the decks reorder, this list is not one page's worth of rows — the
     * screen shows whichever pages the account holds, and the request is a bare
     * list of ids with no page on it. Without this an INCRC editor could reorder
     * the whole site's articles, including the all-pages ones, by posting ids they
     * were never shown.
     */
    const mine = new Set((await listArticles(session)).map((article) => article.id));
    if (!ids.every((id) => mine.has(id))) {
      return NextResponse.json({ error: "Your account cannot edit that." }, { status: 403 });
    }

    await reorderArticles(ids);
    revalidateArticlePages();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/articles] PATCH", error);
    return NextResponse.json({ error: "Could not save the new order." }, { status: 500 });
  }
}
