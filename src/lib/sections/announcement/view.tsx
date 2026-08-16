import { articleDate, slugFromArticleHref } from "@/lib/articles";
import { readableInk } from "@/lib/colour";
import { slugFromDeckHref } from "@/lib/decks";
import type { SectionViewProps } from "@/lib/sections/types";
import type { Announcement } from "./model";
import { cn } from "@/lib/utils";
import { ArrowIcon } from "@/components/ui/ActionButton";
import { Reveal } from "@/components/ui/Reveal";

/**
 * One thing worth interrupting for, at the top of the page.
 *
 * The register band's treatment — a flat coloured rectangle with a soft wash off
 * one corner — with two differences that are the whole point of it. The colour
 * is chosen per announcement rather than fixed to the accent, and the card is
 * two columns: the picture on the left, the words and the button on the right.
 *
 * ── Why the colour is inline and the type is not ──────────────────────────
 *
 * A colour that is typed cannot be a utility class: Tailwind's stylesheet is
 * built from the source, so a class assembled from a variable is not in it. The
 * background therefore goes in a `style` attribute, and `hexColour` is what
 * makes that safe — nothing reaches this component that is not six hex digits.
 *
 * The TYPE is still classes, because there are only ever two of them. `auto`
 * measures the colour and picks the readable one; the other two are the
 * editor overruling that.
 *
 * ── Why this draws its own button ─────────────────────────────────────────
 *
 * ActionButton says in its own header to resist a fourth variant, and it is
 * right: its three are the site's button vocabulary and a per-card colour is not
 * a variant, it is a value. So the pill below is drawn here — inverted, ink
 * behind the card's own colour — and imports that file's `ArrowIcon` so the knob
 * is the same knob every other call to action on the site wears.
 */
export function AnnouncementView({
  value: announcement,
  records,
}: SectionViewProps<Announcement>) {
  // The card resolves its link against these for the cover, the words and the
  // date it does not carry itself.
  const { articles, decks } = records;

  /*
   * What this points at, read out of the address rather than stored beside it.
   * Neither lookup finding anything is not an error — it is a typed link, which
   * is the third thing the picker offers.
   */
  const articleSlug = slugFromArticleHref(records.site, announcement.href);
  const deckSlug = slugFromDeckHref(records.site, announcement.href);

  const article = articleSlug ? articles.find((entry) => entry.slug === articleSlug) : undefined;
  const deck = deckSlug ? decks.find((entry) => entry.slug === deckSlug) : undefined;

  // The three overrides. Blank takes it from whatever this points at, so an
  // article renamed on its own screen renames this card too.
  const image = announcement.image || article?.cover_image || deck?.cover || "";
  const label = announcement.ctaLabel || article?.title || deck?.name || "";
  const date = articleDate(announcement.date || article?.published_at || "");

  /*
   * Nothing written is no section — the same guard the register band makes, and
   * for the same reason: with no words in it this is not a quiet band, it is the
   * loudest thing on the page saying nothing at all.
   *
   * The resolved label and picture count, not just the typed ones. A card that
   * only points at an article still has an article's title and cover to draw.
   */
  if (!announcement.kicker && !announcement.title && !announcement.body && !label && !image) {
    return null;
  }

  const ink = announcement.ink === "auto" ? readableInk(announcement.colour) : announcement.ink;
  const dark = ink === "dark";

  // Derived, never stored: an anchor or a path on this site is a move within the
  // page, and a new tab for one of those is a bug rather than a courtesy.
  const offSite = announcement.href.startsWith("http");

  return (
    <section id="announcement" className="shell py-8 sm:py-10">
      <Reveal>
        <div
          style={{ backgroundColor: announcement.colour }}
          className={cn(
            "relative overflow-hidden rounded-card px-6 py-8 sm:px-10 sm:py-10",
            dark ? "text-black" : "text-white"
          )}
        >
          {/* The register band's corner wash, in whichever ink this card wears —
              a single flat colour is a lot of it at this size. */}
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl",
              dark ? "bg-black/10" : "bg-white/10"
            )}
          />

          <div
            className={cn(
              "relative grid items-center gap-7 sm:gap-9",
              // No picture drops the column rather than leaving a gap where one
              // would have been.
              image && "md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]"
            )}
          >
            {image ? (
              <img
                src={image}
                alt={announcement.imageAlt}
                loading="lazy"
                decoding="async"
                // A tile rather than the card's own radius: it sits inside the
                // padding, so matching the outer corner would read as a mistake.
                className="block aspect-[16/10] w-full rounded-panel object-cover"
              />
            ) : null}

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {announcement.kicker ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em]",
                      dark ? "border-black/25" : "border-white/30"
                    )}
                  >
                    {announcement.kicker}
                  </span>
                ) : null}

                {date ? (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-3.5 py-1.5 text-[11px] font-semibold",
                      dark ? "bg-black/10" : "bg-white/15"
                    )}
                  >
                    {date}
                  </span>
                ) : null}
              </div>

              {announcement.title ? (
                <h2
                  className={cn(
                    // `headline` carries `text-fg`, which is white and would win
                    // over the card's ink on a light colour. The rest of it —
                    // the display face, the weight, the tight leading — is what
                    // makes this a headline, so it is kept and the colour is
                    // stated after it.
                    "headline text-[clamp(1.5rem,3vw,2.35rem)]",
                    dark ? "text-black" : "text-white",
                    (announcement.kicker || date) && "mt-4"
                  )}
                >
                  {announcement.title}
                </h2>
              ) : null}

              {announcement.body ? (
                <p
                  className={cn(
                    "max-w-xl text-[15px] leading-relaxed",
                    dark ? "text-black/75" : "text-white/75",
                    (announcement.kicker || date || announcement.title) && "mt-3"
                  )}
                >
                  {announcement.body}
                </p>
              ) : null}

              {label && announcement.href ? (
                <a
                  href={announcement.href}
                  target={offSite ? "_blank" : undefined}
                  rel={offSite ? "noreferrer" : undefined}
                  style={{ color: announcement.colour }}
                  className={cn(
                    "group mt-7 inline-flex items-center gap-2.5 rounded-full py-1.5 pl-6 pr-1.5 text-sm font-semibold",
                    "transition-all duration-300 hover:-translate-y-0.5 active:translate-y-0",
                    dark ? "bg-black hover:bg-black/85" : "bg-white hover:bg-white/90"
                  )}
                >
                  {announcement.emoji ? (
                    // Presentational: the label beside it already says where
                    // this goes, and a screen reader announcing "party popper"
                    // in the middle of a button name helps nobody.
                    <span aria-hidden>{announcement.emoji}</span>
                  ) : null}
                  {label}
                  <span
                    style={{ backgroundColor: announcement.colour }}
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      dark ? "text-black" : "text-white"
                    )}
                  >
                    <ArrowIcon className="transition-transform duration-300 group-hover:translate-x-0.5" />
                  </span>
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
