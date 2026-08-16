import { NextResponse } from "next/server";
import { guardSites } from "@/lib/server/access";
import { createSite, listSites } from "@/lib/server/sitesRepo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The sports themselves. Owner only, both ways.
 *
 * Creating one is the single most consequential write in this admin: it mints a
 * URL prefix, a media folder root and a permission scope all at once, and none
 * of the three can be renamed afterwards. So the slug is validated in three
 * places that do not trust each other — `siteSlugProblem` in the browser for
 * the message, again in `createSite` for the refusal, and a CHECK constraint in
 * migration 0012 for the guarantee.
 */

export async function GET() {
  const denied = await guardSites();
  if (denied) return denied;

  try {
    return NextResponse.json({ sites: await listSites() });
  } catch (error) {
    console.error("[admin/sites] GET", error);
    return NextResponse.json({ error: "Could not load the sports." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const denied = await guardSites();
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { slug, name, status, accent, modules } = (body ?? {}) as Record<string, unknown>;

  try {
    const site = await createSite({
      slug: typeof slug === "string" ? slug : "",
      name: typeof name === "string" ? name : "",
      status: typeof status === "string" ? status : "draft",
      accent: typeof accent === "string" ? accent : "",
      modules,
    });

    return NextResponse.json({ site });
  } catch (error) {
    /*
     * `createSite` throws the sentence `siteSlugProblem` wrote — which rule was
     * broken and how to fix it — so it is passed through rather than replaced
     * with "could not save". A slug rejection is the one failure here that the
     * person can act on without help.
     */
    const message = error instanceof Error ? error.message : "";
    if (message && !message.includes("could not be read back")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    console.error("[admin/sites] POST", error);
    return NextResponse.json({ error: "Could not create the sport." }, { status: 500 });
  }
}
