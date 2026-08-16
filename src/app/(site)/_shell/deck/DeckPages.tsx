import { pageAlt, type Deck } from "@/lib/decks";
import { cn } from "@/lib/utils";

/**
 * The images of a deck, one below another, and nothing else.
 *
 * Rendered by the public page AND by the admin's preview, so what an editor
 * sees while reordering is the page itself rather than a mock of it.
 *
 * ── The decisions in here ─────────────────────────────────────────────────
 *
 * One column, capped at a readable width. A deck is a document — a rules pack,
 * a proposal, a scanned brief — and a document read edge to edge on a 27-inch
 * monitor is unreadable. The cap is on the images rather than the page, so the
 * surface still runs the full width of the card the site is drawn in.
 *
 * The first two are loaded eagerly and everything after them lazily. A deck can
 * be fifty images; asking for all fifty at once on a phone is a page that takes
 * a minute to become useful, and lazy loading the very first is the opposite
 * mistake — that one IS the page.
 *
 * No width or height is stored on a page, so nothing here can reserve the space
 * an image is about to take. That is a real cost — the stack settles as each
 * one arrives — and it is the price of letting an editor paste any URL rather
 * than only upload, which is what was asked for. Lazy loading keeps it below
 * the fold, where the browser's own scroll anchoring absorbs it.
 */
export function DeckPages({ deck, className }: { deck: Deck; className?: string }) {
  if (deck.pages.length === 0) return null;

  return (
    <div className={cn("mx-auto flex w-full max-w-4xl flex-col gap-2 sm:gap-3", className)}>
      {deck.pages.map((page, index) => (
        <img
          // Position IS a page's identity here — nothing stores a page number —
          // so the URL and the index together are the only stable key, and the
          // index alone is the honest one.
          key={`${index}-${page.url}`}
          src={page.url}
          alt={pageAlt(deck, page, index)}
          loading={index < 2 ? "eager" : "lazy"}
          decoding="async"
          className="block h-auto w-full rounded-[6px] bg-panel"
        />
      ))}
    </div>
  );
}
