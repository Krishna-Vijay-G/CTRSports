"use client";

import { articleDate, slugFromArticleHref, type ArticleSummary } from "@/lib/articles";
import { MAX_POSTS, type Post, type Posts } from "./model";
import { Button } from "@/admin/ui/Button";
import { ButtonFields, Field, Hint, Note, Panel, Row, TextArea } from "@/admin/components/Fields";
import { ImageField } from "@/admin/components/ImageField";
import { LinkPicker } from "@/admin/components/LinkPicker";
import { Repeater } from "@/admin/components/Repeater";
import type { SectionPanelProps } from "@/lib/sections/types";

/**
 * The newsroom grid.
 *
 * ── A card is written, not referenced ─────────────────────────────────────
 *
 * Each one holds its own photograph, headline, excerpt and date. It is NOT a
 * pointer at an article, and that is deliberate: a card can point at anything —
 * an article, a deck, a press release on somebody else's site — and a
 * championship often wants the headline on the card to read differently from the
 * headline on the piece.
 *
 * The cost of that is retyping, which is what the fill button below removes.
 * Choose an article and the card takes its cover, its headline, its opening line
 * and its date in one go; edit any of them afterwards and the card keeps your
 * version, because the card is the thing that is stored.
 *
 * ── Why not "show every published article", like the entry forms band ─────
 *
 * Because this is a front page, not an index: a chosen few, in a chosen order,
 * with a chosen photograph. `registrations` shows every published form because
 * every one of them belongs on the page; an eightieth article does not belong on
 * the front, and the order it belongs in is editorial rather than the order it
 * was written in.
 *
 * The index already exists as a ROUTE — `/<sport>/articles`, every published
 * piece, newest arrangement first. Point the heading's button at it and this
 * band becomes the front page with "all articles" beside it, which is the
 * arrangement it was built for.
 */
export function PostsPanel({ value, onChange, ctx }: SectionPanelProps<Posts>) {
  const { articles, decks, site } = ctx.records;

  const set = (patch: Partial<Posts>) => onChange({ ...value, ...patch });

  /** The article a card points at, if it points at one of this site's. */
  const articleFor = (post: Post): ArticleSummary | undefined => {
    const slug = slugFromArticleHref(site, post.href);
    return slug ? articles.find((entry) => entry.slug === slug) : undefined;
  };

  /**
   * The card, as the article would write it.
   *
   * `category` is left alone: an article has nothing that means it, and the chip
   * is usually a word the page uses rather than a word the piece does.
   */
  const fromArticle = (article: ArticleSummary): Partial<Post> => ({
    image: article.cover_image,
    title: article.title,
    excerpt: article.subtext,
    date: articleDate(article.published_at),
  });

  /** Nothing written yet — safe to fill without asking. */
  const isBlank = (post: Post) => !post.title && !post.excerpt && !post.image;

  return (
    <>
      <Panel title="Heading">
        <div className="space-y-3">
          <Field label="Label" value={value.label} onChange={(label) => set({ label })} />
          <Field label="Title" value={value.title} onChange={(title) => set({ title })} />
          <ButtonFields
            hint="beside the heading"
            label={value.ctaLabel}
            href={value.ctaHref}
            onLabel={(ctaLabel) => set({ ctaLabel })}
            onHref={(ctaHref) => set({ ctaHref })}
          />
        </div>
      </Panel>

      <Repeater<Post>
        title="Posts"
        addLabel="Add post"
        items={value.items}
        max={MAX_POSTS}
        onChange={(items) => set({ items })}
        blank={() => ({
          id: crypto.randomUUID(),
          image: "",
          category: "",
          date: "",
          title: "",
          excerpt: "",
          href: "#",
        })}
        keyOf={(item) => item.id}
        summary={(post, index) => ({
          title: post.title || `Post ${index + 1}`,
          hint: [post.category, post.date].filter(Boolean).join(" · "),
          image: post.image,
        })}
        empty="No posts — the whole section is left off the page."
        note="Three across on a laptop, so multiples of three fill the row. The whole card is the link. Point one at an article and it can take that article's cover, headline and date."
      >
        {(post, index, patch) => {
          const article = articleFor(post);

          return (
            <>
              {/*
                First, not last. Choosing what the card points at is the decision
                that can fill everything below it, so it belongs above the fields
                it fills rather than at the foot where it was.
              */}
              <LinkPicker
                label="Links to"
                value={post.href}
                onChange={(href) => {
                  const slug = slugFromArticleHref(site, href);
                  const chosen = slug ? articles.find((entry) => entry.slug === slug) : undefined;

                  // An empty card takes the article's words straight away; there
                  // is nothing to overwrite and nothing to ask about. A card
                  // somebody has written keeps what it says, and offers the
                  // button below instead.
                  patch(chosen && isBlank(post) ? { href, ...fromArticle(chosen) } : { href });
                }}
                articles={articles}
                decks={decks}
                hint="An article, a deck, or any address. The whole card is the link."
              />

              {article ? (
                <div className="rounded-md border border-border bg-background/60 p-2.5">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => patch(fromArticle(article))}
                  >
                    Use “{article.title || "this article"}”&rsquo;s cover, headline and date
                  </Button>
                  <Hint className="mt-1.5">
                    Overwrites the photo, headline, excerpt and date below. The category is left
                    alone, and so is anything you change afterwards — the card is what is stored,
                    not the article.
                  </Hint>
                </div>
              ) : null}

              <ImageField label="Photo" value={post.image} onChange={(image) => patch({ image })} />
              <Row>
                <Field
                  label="Category"
                  value={post.category}
                  onChange={(category) => patch({ category })}
                  maxLength={40}
                  hint="The chip on the photo."
                />
                <Field
                  label="Date"
                  value={post.date}
                  onChange={(date) => patch({ date })}
                  maxLength={40}
                  hint="Written as you want it read."
                />
              </Row>
              <TextArea
                label="Headline"
                value={post.title}
                onChange={(title) => patch({ title })}
                rows={2}
                placeholder={`Post ${index + 1}`}
              />
              <TextArea
                label="Excerpt"
                value={post.excerpt}
                onChange={(excerpt) => patch({ excerpt })}
                rows={3}
              />
            </>
          );
        }}
      </Repeater>

      {articles.length === 0 ? (
        <Note>
          No published articles on this sport yet. Write one on the Articles screen and it becomes
          pickable here — a draft is not offered, because the card would point at a page that 404s.
        </Note>
      ) : null}
    </>
  );
}
