import { BODY_MAX, isRecord, list, optionalText, text } from "@/lib/normalise";
import { isUsableSlug } from "@/lib/slug";
import type { SectionModule } from "@/lib/sections/types";

/**
 * One card pointing at a deck.
 *
 * `slug` is the deck's address and the only part that is a reference — the same
 * choice `Round.trackId` makes, and for the same reason: this value is
 * normalised in the BROWSER as well as on the server, where nothing can be
 * looked up. The renderer resolves it against the decks it was handed, and a
 * card whose deck has gone is dropped rather than drawn as a dead link.
 *
 * `title` and `blurb` are OVERRIDES, blank almost always. The card shows the
 * deck's own name and line, so renaming a deck corrects every page pointing at
 * it — these are for the page that needs to call it something else in context.
 */
export type DeckCard = { slug: string; title: string; blurb: string };

/**
 * Cards pointing at decks — the picked ones, unlike the entry forms.
 *
 * The difference is deliberate. Every published form for a site belongs on its
 * page, so that section takes the lot. A deck belongs to nobody: the same screen
 * holds the entry pack this page wants and the sponsorship deck it does not, so
 * which ones appear here is an editorial choice and is stored.
 */
export type Decks = { label: string; title: string; body: string; items: DeckCard[] };

/** Past a dozen this is an index, not a band. */
export const MAX_DECK_CARDS = 12;

export const BLANK_DECKS: Decks = { label: "", title: "", body: "", items: [] };

/**
 * A deck's address, or "".
 *
 * The same rule the decks table itself enforces, applied to the reference: a
 * card holding anything that is not a usable slug names no deck, and the section
 * drops it rather than rendering a link to `/deck/undefined`. Nothing here
 * checks that the deck EXISTS — this runs in the browser too, where there is
 * nothing to ask.
 */
function deckSlug(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim().toLowerCase();
  return isUsableSlug(trimmed) ? trimmed : "";
}

export const decks: SectionModule<Decks> = {
  type: "decks",
  label: "Decks",
  hint: "Cards linking to decks — the entry pack, the regulations. The decks themselves live on the Decks screen.",
  surface: ["home"],
  multiple: true,
  anchor: "decks",
  needs: ["decks"],
  blank: () => ({ ...BLANK_DECKS, items: [] }),
  normalise: (raw) => {
    const d = BLANK_DECKS;
    const value = isRecord(raw) ? raw : {};

    return {
      label: text(value.label, d.label),
      title: text(value.title, d.title),
      body: text(value.body, d.body, BODY_MAX),
      items: list<DeckCard>(
        value.items,
        MAX_DECK_CARDS,
        (entry) => ({
          slug: deckSlug(entry.slug),
          title: optionalText(entry.title),
          blurb: optionalText(entry.blurb, BODY_MAX),
        }),
        d.items
      ),
    };
  },
};
