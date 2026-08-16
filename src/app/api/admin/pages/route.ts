import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { guardRequestSite } from "@/lib/server/access";
import { readSitePage, savePage } from "@/lib/server/contentRepo";
import { revalidateSitePages } from "@/lib/server/revalidateSite";
import type { GrantModule } from "@/lib/roles";
import { siteHref, type PageKind } from "@/lib/sites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A site's page, read and written whole.
 *
 * One route where there were two — `/api/admin/content` for the landing page and
 * `/api/admin/incrc` for the sport — because there is one kind of page now. The
 * site comes from `?site=<slug>` and is guarded before anything is read, so an
 * account with a grant on one sport cannot reach another's by changing it.
 *
 * There is no per-section endpoint on purpose: the console holds the whole page,
 * including the running order and which sections are on it, and saves it in one
 * go. A partial write has no way to leave a section placed with nothing in it.
 *
 * ── Which page, and what that costs to get wrong ──────────────────────────
 *
 * `?page=home|chrome` since 0017 split the header and footer onto a page of
 * their own. The two are different GRANTS — somebody may be trusted with a
 * sport's copy without being trusted with its navigation — so the parameter has
 * to be read and mapped to a module BEFORE the guard runs, which is the one
 * ordering in this file that matters. An unknown value is refused rather than
 * defaulted: defaulting to `home` would mean a typo silently wrote the wrong
 * page, and this is the endpoint that replaces a page wholesale.
 */

const PAGES: Record<string, { kind: PageKind; module: GrantModule }> = {
  home: { kind: "home", module: "page" },
  chrome: { kind: "chrome", module: "chrome" },
};

function wanted(request: Request) {
  return PAGES[new URL(request.url).searchParams.get("page")?.trim() || "home"] ?? null;
}

const NO_SUCH_PAGE = NextResponse.json(
  { error: "No such page on this sport." },
  { status: 400 }
);

export async function GET(request: Request) {
  const page = wanted(request);
  if (!page) return NO_SUCH_PAGE;

  const guard = await guardRequestSite(request, page.module);
  if (guard.denied) return guard.denied;

  try {
    return NextResponse.json({ sections: await readSitePage(guard.site, page.kind) });
  } catch (error) {
    console.error("[admin/pages] GET", error);
    return NextResponse.json({ error: "Could not load the page." }, { status: 500 });
  }
}

/**
 * Replaces the page.
 *
 * Nothing is rejected for being blank — clearing a line of copy is a real
 * editorial choice. `savePage` normalises first, so an over-long or wrong-typed
 * field is clamped rather than stored, a section of a kind this build does not
 * know is dropped rather than written back, and a section that does not belong
 * on this page's surface is dropped too.
 */
export async function PUT(request: Request) {
  const page = wanted(request);
  if (!page) return NO_SUCH_PAGE;

  const guard = await guardRequestSite(request, page.module);
  if (guard.denied) return guard.denied;

  const { site } = guard;

  let body: unknown;
  try {
    body = (await request.json())?.sections;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const sections = await savePage(site, page.kind, body);

    /*
     * How far the change reaches is the difference between the two pages.
     *
     * A band belongs to one page and is cleared with that page's own address —
     * `siteHref` gives "" for the root, and `revalidatePath("")` is not a path,
     * so "/" for the root and "/<slug>" for a sport. The chrome is drawn around
     * every route this site serves, so a header saved with only the home page
     * cleared would leave the old one on every deck, article and entry form
     * until each of them happened to expire.
     */
    if (page.kind === "chrome") revalidateSitePages(site);
    else revalidatePath(siteHref(site) || "/");

    return NextResponse.json({ sections });
  } catch (error) {
    console.error("[admin/pages] PUT", error);
    return NextResponse.json({ error: "Could not save the page." }, { status: 500 });
  }
}
