import { NextResponse } from "next/server";
import { isDeckId } from "@/lib/decks";
import { isFormId } from "@/lib/forms";
import { isUsableSlug, type SlugCheck, type SlugHolder, type SlugKind } from "@/lib/slug";
import { guardForms, guardPage } from "@/lib/server/access";
import * as decks from "@/lib/server/decksRepo";
import * as forms from "@/lib/server/formsRepo";
import { revalidateDeckPages } from "@/lib/server/revalidateDecks";
import { revalidateFormPages } from "@/lib/server/revalidateForms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Who holds an address, and how to take one back.
 *
 * This exists because the answer was only ever available at the moment of
 * saving. An admin typed an address, pressed Save, and found out from a 409
 * that it belonged to something else — by which point the rest of their edits
 * were sitting unsaved behind the refusal. Asked while they type, the same fact
 * is a sentence under the box.
 *
 * It is one route for both kinds rather than a pair, because the question and
 * the answer are identical and only the table differs. What does NOT collapse
 * is the guard: forms and decks are edited by different roles, so the kind
 * decides which one runs, and a deck editor cannot use this to enumerate the
 * registration forms.
 *
 * Forms and decks are checked SEPARATELY and never against each other. They
 * publish under different prefixes — /register/ and /deck/ — so `entry-pack`
 * being both a form and a deck is two different pages, not a collision.
 */

type Repo = {
  findSlugOwner: (slug: string, exceptId?: string) => Promise<SlugHolder | null>;
  releaseFormerSlug: (slug: string, fromId: string) => Promise<boolean>;
  isId: (value: unknown) => value is string;
  guard: () => Promise<NextResponse | null>;
  revalidate: (slug: string) => void;
};

const REPOS: Record<SlugKind, Repo> = {
  form: {
    findSlugOwner: forms.findSlugOwner,
    releaseFormerSlug: forms.releaseFormerSlug,
    isId: isFormId,
    guard: guardForms,
    // The forms revalidator takes no paths — a form's own page is rendered on
    // demand, so only the pages listing them are cached.
    revalidate: () => revalidateFormPages(),
  },
  deck: {
    findSlugOwner: decks.findSlugOwner,
    releaseFormerSlug: decks.releaseFormerSlug,
    isId: isDeckId,
    guard: () => guardPage("decks"),
    // The released address stops redirecting, so a cached page sitting under it
    // would keep serving the old deck to anyone on the old link.
    revalidate: (slug) => revalidateDeckPages([slug]),
  },
};

function repoFor(value: unknown): Repo | null {
  return value === "form" || value === "deck" ? REPOS[value] : null;
}

/** `?kind=form&slug=2026-entry&exceptId=<uuid>` — is this address free? */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const repo = repoFor(url.searchParams.get("kind"));
  if (!repo) return NextResponse.json({ error: "Unknown kind." }, { status: 400 });

  const denied = await repo.guard();
  if (denied) return denied;

  const slug = (url.searchParams.get("slug") ?? "").trim().toLowerCase();

  // The thing being edited holds its own address, and telling somebody their
  // own slug is taken is the fastest way to make a warning ignored.
  const exceptId = url.searchParams.get("exceptId") ?? "";
  if (exceptId && !repo.isId(exceptId)) {
    return NextResponse.json({ error: "Not an id." }, { status: 400 });
  }

  if (!isUsableSlug(slug)) {
    return NextResponse.json({ status: "invalid" } satisfies SlugCheck);
  }

  try {
    const holder = await repo.findSlugOwner(slug, exceptId);
    return NextResponse.json(
      (holder ? { status: "taken", holder } : { status: "free" }) satisfies SlugCheck
    );
  } catch (error) {
    console.error("[admin/slugs] GET", error);
    return NextResponse.json({ error: "Could not check that address." }, { status: 500 });
  }
}

/**
 * Hands a FORMER address back, so something else may take it.
 *
 * `{ kind, slug, fromId }`. The row named by `fromId` stops answering to it, and
 * whoever asked is then free to save it as their own — a second step, on
 * purpose, because a save that quietly rewrote another record's redirects on the
 * way past would be the same silent theft this whole change exists to stop.
 *
 * A CURRENT address cannot be released. The repo enforces that in its `WHERE`
 * rather than trusting this handler to have checked, and the check here is only
 * so the refusal says something useful.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { kind, slug, fromId } = (body ?? {}) as {
    kind?: unknown;
    slug?: unknown;
    fromId?: unknown;
  };

  const repo = repoFor(kind);
  if (!repo) return NextResponse.json({ error: "Unknown kind." }, { status: 400 });

  const denied = await repo.guard();
  if (denied) return denied;

  const address = typeof slug === "string" ? slug.trim().toLowerCase() : "";
  if (!isUsableSlug(address) || !repo.isId(fromId)) {
    return NextResponse.json({ error: "Expected an address and an id." }, { status: 400 });
  }

  try {
    const holder = await repo.findSlugOwner(address);

    if (holder?.held === "current") {
      return NextResponse.json(
        { error: `That is where “${holder.name}” lives now, not an old address of it.` },
        { status: 409 }
      );
    }

    const released = await repo.releaseFormerSlug(address, fromId);
    if (!released) {
      // Somebody else got there first, or it was already retired. Either way the
      // address is free, which is what the caller wanted.
      return NextResponse.json({ ok: true, released: false });
    }

    repo.revalidate(address);
    return NextResponse.json({ ok: true, released: true });
  } catch (error) {
    console.error("[admin/slugs] POST", error);
    return NextResponse.json({ error: "Could not free that address." }, { status: 500 });
  }
}
