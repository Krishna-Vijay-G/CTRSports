/**
 * A deck's rules, checked.
 *
 *   npm run check:decks
 *
 * Small, because a deck is a small thing: an address, a status and a list of
 * images. What is worth pinning down is the part that is NOT small — the
 * address, which gets printed on a poster and has to survive a rename, and the
 * page list, which is the only place a silent drop would cost somebody a
 * document with a hole in it.
 *
 * No database and no network. What this cannot check is the SQL or the screens.
 */

import {
  MAX_DECK_PAGES,
  deckHref,
  isDeckId,
  normaliseDeckInput,
  normaliseDeckPages,
  pageAlt,
  slugFromDeckHref,
  summariseDeck,
  type Deck,
} from "@/lib/decks";
import { decks as decksModule, type Decks } from "@/lib/sections/decks/model";
import { isUsableSlug, slugify } from "@/lib/slug";

let failures = 0;

function check(label: string, got: unknown, want: unknown): void {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : " FAIL "}${label}`);
  if (!ok) console.log(`        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`);
}

function section(title: string): void {
  console.log(`\n${title}`);
}

/* ───────────────────────────── The address ──────────────────────────── */

section("A deck always gets a usable address");
{
  const named = normaliseDeckInput({ name: "2026 Entry Pack" });
  check("made from the name when none is typed", named.slug, "2026-entry-pack");

  const typed = normaliseDeckInput({ name: "2026 Entry Pack", slug: "pack" });
  check("a typed address is kept", typed.slug, "pack");

  const notes: string[] = [];
  const messy = normaliseDeckInput({ name: "Pack", slug: "Entry Pack!" }, notes);
  check("a messy one is tidied", messy.slug, "entry-pack");
  check("and that is reported", notes.length, 1);

  // A name with no ASCII letters at all slugifies to "", which is not NULL —
  // the first such row would save with a broken address and every one after it
  // would collide with it.
  const nothing = normaliseDeckInput({ name: "日本" });
  check("a name with no letters still gets one", isUsableSlug(nothing.slug), true);

  // The two halves of the rule have to agree: slugify must never emit something
  // isUsableSlug then rejects.
  check("a one-letter name is not rejected", isUsableSlug(slugify("A")), true);
}

{
  // Keeping the current slug among the former ones would make the redirect a
  // loop: /deck/pack matches its own row as a FORMER address and redirects to
  // itself.
  const deck = normaliseDeckInput({
    name: "Pack",
    slug: "pack",
    former_slugs: ["pack", "Old-Pack", "!!!", "older-pack"],
  });

  check("the current address is not also a former one", deck.former_slugs, [
    "old-pack",
    "older-pack",
  ]);
}

section("Addresses read back the way they were written");
{
  // A deck's address is under the sport that owns it, so both directions take
  // one. The root site's prefix is empty, which is the case worth pinning:
  // `sitePath` is the only thing that knows it, and every builder composes onto
  // it rather than checking `kind` for itself.
  const incrc = { slug: "incrc", kind: "sport" } as const;
  const root = { slug: "landing", kind: "root" } as const;

  check("href", deckHref(incrc, { slug: "entry-pack" }), "/incrc/deck/entry-pack");
  check("the root site has no prefix", deckHref(root, { slug: "entry-pack" }), "/deck/entry-pack");
  check("and back again", slugFromDeckHref(incrc, "/incrc/deck/entry-pack"), "entry-pack");
  check("another sport's deck is not this one's", slugFromDeckHref(incrc, "/pickle/deck/entry-pack"), "");
  check("nor is the flat address it used to have", slugFromDeckHref(incrc, "/deck/entry-pack"), "");
  check("a form's address is not a deck's", slugFromDeckHref(incrc, "/incrc/register/entry-pack"), "");
  check("nor is a path with more on it", slugFromDeckHref(incrc, "/incrc/deck/entry-pack/2"), "");
  check("a malformed id never reaches Postgres", isDeckId("../../etc"), false);
}

/* ────────────────────────────── The pages ───────────────────────────── */

section("A page with no picture on it is dropped, not kept as a hole");
{
  const pages = normaliseDeckPages([
    { url: "/images/a.webp", alt: "Cover" },
    { url: "", alt: "Left blank" },
    { url: "javascript:alert(1)", alt: "Not a picture" },
    { url: "https://example.com/b.webp" },
    "not an object",
  ]);

  check("only the usable ones survive", pages, [
    { url: "/images/a.webp", alt: "Cover" },
    { url: "https://example.com/b.webp", alt: "" },
  ]);
}

{
  // The cap has to be applied AFTER the blanks are dropped, or a list with
  // empty rows scattered through it loses real pages off the end.
  const sent = [
    ...Array.from({ length: 10 }, () => ({ url: "" })),
    ...Array.from({ length: MAX_DECK_PAGES }, (_, index) => ({ url: `/images/${index}.webp` })),
  ];

  const pages = normaliseDeckPages(sent);
  check("blanks do not eat the end of the list", pages.length, MAX_DECK_PAGES);
  check("and the last real page is still there", pages[MAX_DECK_PAGES - 1].url, "/images/49.webp");
}

{
  const notes: string[] = [];
  normaliseDeckInput({ name: "Pack", pages: [{ url: "/a.webp" }, { url: "" }] }, notes);
  check("a dropped page is said out loud", notes.length, 1);
}

section("Every page can be announced");
{
  const deck = { name: "Entry pack" };
  check("its own words win", pageAlt(deck, { url: "/a.webp", alt: "The cover" }, 0), "The cover");
  check("otherwise the deck and the number", pageAlt(deck, { url: "/a.webp", alt: "" }, 4), "Entry pack — page 5");
  check("and a nameless deck still says something", pageAlt({ name: "" }, { url: "/a.webp", alt: "" }, 0), "Page 1");
}

/* ───────────────────────────── The summary ──────────────────────────── */

section("A summary carries what a card needs and no more");
{
  const deck: Deck = {
    id: "1",
    site_id: "00000000-0000-0000-0000-000000000001",
    name: "Entry pack",
    slug: "entry-pack",
    status: "published",
    blurb: "Everything for 2026.",
    show_heading: true,
    pages: [{ url: "/a.webp", alt: "" }, { url: "/b.webp", alt: "" }],
    former_slugs: [],
    sort_order: 10,
  };

  check("the first page is the cover", summariseDeck(deck).cover, "/a.webp");
  check("the count comes with it", summariseDeck(deck).pages, 2);
  check("an empty deck has no cover", summariseDeck({ ...deck, pages: [] }).cover, "");
}

/* ─────────────────────── The cards on the page ──────────────────────── */

section("A card names a deck by an address, or names nothing");
{
  const value = decksModule.normalise({
    items: [
      { slug: "entry-pack", title: "", blurb: "" },
      { slug: "Entry Pack!", title: "Nonsense", blurb: "" },
      { slug: 42, title: "Not a string", blurb: "" },
      { slug: "REGS-2026", title: "", blurb: "" },
    ],
  }) as Decks;

  check(
    "usable ones are kept, lower-cased; the rest hold no address",
    value.items.map((card) => card.slug),
    ["entry-pack", "", "", "regs-2026"]
  );
}

{
  // A section placed but never written has to render nothing rather than a
  // heading over a blank strip. The renderer does that; this pins the shape it
  // relies on — and that `blank()` and `normalise(undefined)` agree, which is
  // what makes a newly added section and a never-saved one the same thing.
  check("a section nobody has written has no cards", (decksModule.normalise({}) as Decks).items, []);
  check("and its blank agrees", (decksModule.blank() as Decks).items, []);
}

/* ─────────────────────────────────────────────────────────────────────── */

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
