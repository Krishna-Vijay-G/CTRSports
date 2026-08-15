"use client";

import {
  articleDate,
  slugFromArticleHref,
  type ArticleSummary,
} from "@/lib/articles";
import { readableInk } from "@/lib/colour";
import { slugFromDeckHref, type DeckSummary } from "@/lib/decks";
import {
  ANNOUNCEMENT_INKS,
  DEFAULT_ANNOUNCEMENT_COLOUR,
  type AnnouncementInk,
  type IncrcContent,
} from "@/lib/incrcContent";
import { hexColour } from "@/lib/normalise";
import { Button } from "@/admin/ui/Button";
import { Label } from "@/admin/ui/Input";
import { ColourField } from "@/admin/components/ColourField";
import { Field, Hint, Note, Panel, Row, TextArea } from "@/admin/components/Fields";
import { ImageField } from "@/admin/components/ImageField";
import { LinkPicker } from "@/admin/components/LinkPicker";

type Announcement = IncrcContent["announcement"];

const INK_LABELS: Record<AnnouncementInk, string> = {
  auto: "Auto",
  dark: "Black",
  light: "White",
};

/**
 * The one card at the top of the page, and the only section whose colour is
 * chosen rather than designed.
 *
 * Three of its fields are OVERRIDES and the panel has to say so, because a blank
 * field that means "take it from the article" is indistinguishable from a blank
 * field that means "leave it off" unless something tells you. So the picture,
 * the button's words and the date all show what they would fall back to as their
 * placeholder — the article's own cover, title and date, resolved here the same
 * way the page resolves them.
 */
export function AnnouncementPanel({
  value,
  onChange,
  articles,
  decks,
}: {
  value: Announcement;
  onChange: (next: Announcement) => void;
  /** Every published article, read-only here: they are written on the Articles screen. */
  articles: ArticleSummary[];
  /** Every published deck, read-only for the same reason. */
  decks: DeckSummary[];
}) {
  const set = (patch: Partial<Announcement>) => onChange({ ...value, ...patch });

  // The same resolution the band does, so the placeholders below promise exactly
  // what the page will draw.
  const articleSlug = slugFromArticleHref(value.href);
  const deckSlug = slugFromDeckHref(value.href);
  const article = articleSlug ? articles.find((entry) => entry.slug === articleSlug) : undefined;
  const deck = deckSlug ? decks.find((entry) => entry.slug === deckSlug) : undefined;

  const inheritedLabel = article?.title || deck?.name || "";
  const inheritedDate = article?.published_at ?? "";

  const settledColour = hexColour(value.colour, DEFAULT_ANNOUNCEMENT_COLOUR);
  const automatic = readableInk(settledColour);

  return (
    <>
      <Panel title="Copy">
        <div className="space-y-3">
          <Field
            label="Kicker"
            value={value.kicker}
            onChange={(kicker) => set({ kicker })}
            hint="The outlined chip at the top. Blank hides it."
          />
          <Field label="Title" value={value.title} onChange={(title) => set({ title })} />
          <TextArea label="Body" value={value.body} onChange={(body) => set({ body })} rows={3} />

          <ImageField
            label="Picture"
            value={value.image}
            onChange={(image) => set({ image })}
            hint={
              article?.cover_image
                ? "Blank uses the article's own cover, which is usually what you want."
                : deck?.cover
                  ? "Blank uses the deck's first page."
                  : "Sits to the left of the words. Blank drops the column entirely."
            }
          />
          <Field
            label="Picture description"
            value={value.imageAlt}
            onChange={(imageAlt) => set({ imageAlt })}
            hint="What the picture shows, for anyone who cannot see it."
          />
        </div>
      </Panel>

      <Panel title="Colour">
        <div className="space-y-3">
          <ColourField
            label="Card"
            value={value.colour}
            onChange={(colour) => set({ colour })}
            fallback={DEFAULT_ANNOUNCEMENT_COLOUR}
            hint="The whole card. This is the one thing on the page that is not from the palette, so it is also the one that can be made unreadable."
          />

          <div>
            <Label>Words</Label>
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {ANNOUNCEMENT_INKS.map((ink) => (
                <Button
                  key={ink}
                  variant={value.ink === ink ? "default" : "outline"}
                  size="sm"
                  onClick={() => set({ ink })}
                  aria-pressed={value.ink === ink}
                >
                  {INK_LABELS[ink]}
                </Button>
              ))}
            </div>
            <Hint className="mt-1">
              {value.ink === "auto" ? (
                <>
                  Measured off the colour, and it has chosen{" "}
                  <span className="text-foreground">
                    {automatic === "dark" ? "black" : "white"}
                  </span>
                  . Leave it here unless you disagree.
                </>
              ) : value.ink === automatic ? (
                "The same as Auto would have picked — Auto keeps it right if the colour changes."
              ) : (
                <span className="text-destructive">
                  Auto would have picked {automatic === "dark" ? "black" : "white"} on this
                  colour. Check it is still readable.
                </span>
              )}
            </Hint>
          </div>
        </div>
      </Panel>

      <Panel title="Link">
        <div className="space-y-3">
          <LinkPicker
            label="Goes to"
            value={value.href}
            onChange={(href) => set({ href })}
            articles={articles}
            decks={decks}
          />

          <Row>
            <Field
              label="Emoji"
              value={value.emoji}
              onChange={(emoji) => set({ emoji })}
              maxLength={12}
              placeholder="🏁"
              hint="Before the words. Blank prints none."
            />
            <Field
              label="Date on the chip"
              value={value.date}
              onChange={(date) => set({ date })}
              placeholder={inheritedDate || "YYYY-MM-DD"}
              hint={
                inheritedDate
                  ? `Blank uses ${articleDate(inheritedDate)}.`
                  : "Blank hides the chip."
              }
            />
          </Row>

          <Field
            label="Button"
            value={value.ctaLabel}
            onChange={(ctaLabel) => set({ ctaLabel })}
            maxLength={60}
            placeholder={inheritedLabel || "Blank hides the button"}
            hint={
              inheritedLabel
                ? "Blank uses its own name, which is what you want unless this page calls it something else."
                : "With nothing to take a name from, a blank button is no button."
            }
          />
        </div>
      </Panel>

      <Panel title="About this band">
        <Note>
          One card, high on the page, for the one thing worth interrupting somebody to say. It
          points at an article, a deck, or anywhere you type — and it takes the picture, the
          wording and the date from whatever it points at, so renaming an article on its own
          screen corrects this card too. A link starting <code>http</code> opens in a new tab.
          With nothing written in it the card is not on the page at all.
        </Note>
      </Panel>
    </>
  );
}
