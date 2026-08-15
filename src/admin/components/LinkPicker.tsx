"use client";

import { articleHref, slugFromArticleHref, type ArticleSummary } from "@/lib/articles";
import { deckHref, slugFromDeckHref, type DeckSummary } from "@/lib/decks";
import { Input, Label, Select } from "@/admin/ui/Input";
import { Hint } from "@/admin/components/Fields";

/**
 * Points something at an article, a deck, or anywhere else.
 *
 * ── Why it is one field and not a kind plus a slug ────────────────────────
 *
 * What is stored is the resolved path — `/articles/<slug>` or `/deck/<slug>` —
 * and which of the three it is, is read back out of that. There is no `target`
 * enum beside it, because a second field is a second thing to disagree with the
 * first: an enum saying "deck" over an href pointing at an article is a state
 * this cannot get into.
 *
 * Storing the path rather than the row's id is the decision `FormPicker`
 * documents at length, and it applies unchanged: this value lands in a page's
 * JSONB document whose normaliser runs in the BROWSER, where nothing can be
 * looked up. A rename is paid for elsewhere — both public routes permanently
 * redirect from a former address.
 *
 * ── Named for what it does ────────────────────────────────────────────────
 *
 * `FormPicker` and `DeckPicker` are each named for the one thing they pick from.
 * This one picks from two and offers a third, so it is named for the job.
 */
export function LinkPicker({
  label,
  value,
  onChange,
  articles,
  decks,
  hint,
}: {
  label: string;
  /** The stored href. An /articles/… or /deck/… path shows as a chosen thing. */
  value: string;
  onChange: (href: string) => void;
  /** Every published article. Loaded server-side. */
  articles: ArticleSummary[];
  /** Every published deck. Loaded server-side. */
  decks: DeckSummary[];
  hint?: string;
}) {
  const articleSlug = slugFromArticleHref(value);
  const deckSlug = slugFromDeckHref(value);

  const article = articleSlug ? articles.find((entry) => entry.slug === articleSlug) : undefined;
  const deck = deckSlug ? decks.find((entry) => entry.slug === deckSlug) : undefined;

  const chosen = article ?? deck;
  /*
   * An address that LOOKS like one of ours and resolves to nothing. That is a
   * card on the live site pointing at a 404, and saying so is the whole reason
   * this is a component rather than a text field.
   */
  const missing = !chosen && Boolean(articleSlug || deckSlug);

  return (
    <div className="block">
      <Label>{label}</Label>

      <Select
        value={article ? articleHref(article) : deck ? deckHref(deck) : missing ? "__missing" : "__url"}
        onChange={(event) => {
          const picked = event.target.value;
          // Both escape hatches empty the field rather than keeping the last
          // path — otherwise it reads as chosen while claiming not to be.
          onChange(picked === "__url" || picked === "__missing" ? "" : picked);
        }}
        className="mt-1.5 w-full"
      >
        <option value="__url">— type a link instead —</option>

        {/* Kept as an option so opening this panel cannot silently re-point the
            card at whatever happens to be first in the list. */}
        {missing ? <option value="__missing">{value} — not available</option> : null}

        {articles.length > 0 ? (
          <optgroup label="Articles">
            {articles.map((entry) => (
              <option key={entry.id} value={articleHref(entry)}>
                {entry.title || entry.slug}
              </option>
            ))}
          </optgroup>
        ) : null}

        {decks.length > 0 ? (
          <optgroup label="Decks">
            {decks.map((entry) => (
              <option key={entry.slug} value={deckHref(entry)}>
                {entry.name || entry.slug} · {entry.pages} {entry.pages === 1 ? "page" : "pages"}
              </option>
            ))}
          </optgroup>
        ) : null}
      </Select>

      {/* Only when it is not one of ours: a typed link still has to be editable,
          and this is the same input it would be without the picker. */}
      {!chosen ? (
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://…"
          className="mt-1.5"
        />
      ) : null}

      <Hint className="mt-1">
        {missing ? (
          <span className="text-destructive">
            Nothing published answers to that address any more, so this card has no button.
            Either it was deleted, or it has been set back to a draft.
          </span>
        ) : article ? (
          <>
            Opens <span className="text-foreground">{articleHref(article)}</span>. The card takes
            its picture, its wording and its date from this article unless you fill them in below.
          </>
        ) : deck ? (
          <>
            Opens <span className="text-foreground">{deckHref(deck)}</span>
            {deck.pages === 0 ? " — which has no pages in it yet." : "."} A deck carries no date,
            so type one below if the card should show one.
          </>
        ) : articles.length === 0 && decks.length === 0 ? (
          "Nothing published to point at yet. Articles are written on the Articles screen and decks on the Decks screen."
        ) : (
          (hint ?? "Pick an article or a deck, or type any address.")
        )}
      </Hint>
    </div>
  );
}
