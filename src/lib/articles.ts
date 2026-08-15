/**
 * An article: something somebody WROTE, at an address of its own.
 *
 * Every other editor in this admin fills in a layout — a hero, a marquee, a strip
 * of partners, each a named slot with a picture and a line of copy. An article is
 * the other thing. It has a title, a line under it, a picture at the top, and then
 * however many paragraphs the writer needs, with their own emphasis and their own
 * pictures in the middle of them.
 *
 * ── Why it is a row and not a section ─────────────────────────────────────
 *
 * The deck's reasoning, and it transfers whole: an article is published at
 * `/articles/<slug>` whether or not anything links to it, which is what makes it
 * something you can print on a poster or point three different pages at without
 * copying it three times. A section belongs to the page it sits on.
 *
 * The address is a stored row in `ctr.slugs`, not something derived from the
 * title, because the address outlives the title. Renaming pushes the old address
 * into the history and the public page permanently redirects it, exactly as a deck
 * and a registration form already do.
 *
 * ── Why `page` is nullable, and why null is the STRICT value ──────────────
 *
 * An article belongs to one page — the INCRC editors write the INCRC articles —
 * except when it belongs to all of them, which is the owner writing for the whole
 * site. That case has no page to name, so it names none.
 *
 * `null` therefore means "every page", and every guard reads it as OWNER ONLY.
 * That is the same reading `canOverrideUsage` already applies to a media reference
 * belonging to no page: a thing that is not one page's business can only be judged
 * by the account that can see every page it might affect. Unknown means stricter,
 * never looser.
 *
 * ── Why the body is a document and not HTML ───────────────────────────────
 *
 * See `normaliseArticleBody` at the bottom. It is the whole security argument for
 * this feature and it belongs beside the code that enforces it.
 *
 * Shared by the server and the browser, so nothing here may import `server-only`.
 */

import { image, isRecord, lines, link, oneOf, optionalText, isoDate } from "@/lib/normalise";
import { PAGE_KEYS, PAGE_LABELS, type PageKey } from "@/lib/roles";
import { SLUG_MAX, fallbackSlug, isUsableSlug, slugify, usableSlug } from "@/lib/slug";

/* ─────────────────────────────── Shape ──────────────────────────────── */

/** Draft or published. An article only shows, so there is no third word. */
export const ARTICLE_STATUSES = ["draft", "published"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: "Draft",
  published: "Published",
};

export const ARTICLE_LIMITS = {
  title: 160,
  slug: SLUG_MAX,
  /** The line under the title. Longer than a blurb: it is also the meta description. */
  subtext: 300,
  /** One run of text between two marks. Generous — it is a paragraph, not a label. */
  text: 5000,
  alt: 200,
} as const;

/**
 * What the whole body may hold.
 *
 * Not arbitrary limits for their own sake: `normaliseArticleBody` walks a tree
 * that arrived as JSON from a browser, and a tree with no bound on its size or its
 * depth is a way to spend the server's stack on one request. The numbers are far
 * above any article anybody will write and far below anything that hurts.
 */
export const ARTICLE_BODY_MAX_NODES = 2000;
export const ARTICLE_MAX_IMAGES = 60;
export const ARTICLE_MAX_DEPTH = 6;

/* ── The document ─────────────────────────────────────────────────────── */

/**
 * The marks a run of text may carry.
 *
 * Underline is here and is NOT a Markdown concept, which is the short answer to
 * why the body is not Markdown. It was asked for, and a Markdown body would have
 * had to invent a convention for it.
 */
export type ArticleMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "underline" }
  | { type: "link"; attrs: { href: string } };

export type ArticleInline =
  | { type: "text"; text: string; marks?: ArticleMark[] }
  | { type: "hardBreak" };

export type ArticleListItem = { type: "listItem"; content: ArticleNode[] };

/**
 * Headings start at 2 because the page prints the article's title as its H1.
 * A second H1 in the body is not a style preference, it is a broken outline.
 */
export type ArticleNode =
  | { type: "paragraph"; content?: ArticleInline[] }
  | { type: "heading"; attrs: { level: 2 | 3 }; content?: ArticleInline[] }
  | { type: "blockquote"; content: ArticleNode[] }
  | { type: "bulletList"; content: ArticleListItem[] }
  | { type: "orderedList"; content: ArticleListItem[] }
  | { type: "image"; attrs: { src: string; alt: string } }
  | { type: "horizontalRule" };

export type ArticleDoc = { type: "doc"; content: ArticleNode[] };

export const EMPTY_ARTICLE_DOC: ArticleDoc = { type: "doc", content: [] };

/* ── The article ──────────────────────────────────────────────────────── */

export type Article = {
  id: string;
  title: string;
  /** The address. `/articles/<slug>`. */
  slug: string;
  status: ArticleStatus;
  /** The page it belongs to, or null for every page. Null takes the owner. */
  page: PageKey | null;
  /** The line under the title, what a card says, and the meta description. */
  subtext: string;
  cover_image: string;
  /** `YYYY-MM-DD` or "". Printed under the title; never used for ordering. */
  published_at: string;
  body: ArticleDoc;
  /** Addresses it used to answer to. The public page redirects from these. */
  former_slugs: string[];
  sort_order: number;
};

export const BLANK_ARTICLE: Omit<Article, "id"> = {
  title: "",
  slug: "",
  status: "draft",
  page: null,
  subtext: "",
  cover_image: "",
  published_at: "",
  body: EMPTY_ARTICLE_DOC,
  former_slugs: [],
  sort_order: 0,
};

/**
 * An article reduced to what a LIST of them needs.
 *
 * The public index and the admin's own rail want the same handful of things and
 * neither wants the body. Sending the whole row would put every paragraph of every
 * article into a page payload whose only use for them is a card.
 */
export type ArticleSummary = {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  page: PageKey | null;
  subtext: string;
  cover_image: string;
  published_at: string;
};

export function summariseArticle(article: Article): ArticleSummary {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    status: article.status,
    page: article.page,
    subtext: article.subtext,
    cover_image: article.cover_image,
    published_at: article.published_at,
  };
}

/* ────────────────────────────── Addresses ───────────────────────────── */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Same reasoning as the decks and the forms: a malformed id should 404. */
export function isArticleId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function articleHref(article: Pick<Article, "slug">): string {
  return `/articles/${article.slug}`;
}

/** The slug in a stored `/articles/<slug>` link, or "" if it is not one. */
export function slugFromArticleHref(href: string): string {
  const match = /^\/articles\/([a-z0-9][a-z0-9-]*)$/.exec(href.trim());
  return match ? match[1] : "";
}

/* ────────────────────────── Which page owns one ─────────────────────── */

/** What the "Appears on" control says for each choice. */
export const ALL_PAGES_LABEL = "All pages";

export function articlePageLabel(page: PageKey | null): string {
  return page === null ? ALL_PAGES_LABEL : PAGE_LABELS[page];
}

/**
 * A page key, or null for every page.
 *
 * Anything unrecognised reads as null, which is the STRICTEST answer — an article
 * naming a page that no longer exists becomes one only an owner can touch, rather
 * than one anybody can. Same posture as `normaliseRole`.
 */
export function articlePage(value: unknown): PageKey | null {
  if (typeof value !== "string") return null;
  return (PAGE_KEYS as readonly string[]).includes(value) ? (value as PageKey) : null;
}

/* ──────────────────────── Normalising the body ──────────────────────── */

/**
 * The body, read through a closed set of node types.
 *
 * ── This function is the security boundary ────────────────────────────────
 *
 * Storing the body as HTML would have made this the first place in the project
 * where untrusted markup reaches the DOM, and it would have needed a sanitiser
 * dependency to be safe. Storing a TREE means the public renderer is a `switch`
 * over the union above, and a node type it does not recognise renders as nothing.
 * There is no payload to sanitise because there is no markup — the renderer emits
 * React elements it chose, never a string somebody else wrote.
 *
 * That guarantee only holds if this function is the only way a body is written,
 * and if it works by ALLOWLIST rather than by removing known-bad things. Every
 * branch below names what it keeps; the fall-through drops.
 *
 * Two attributes are still addresses, and they go through the same two helpers
 * every other URL in this project does:
 *
 *   image()  an <img src>, which is why `javascript:` and `//host` cannot be one
 *   link()   an <a href>, same rule plus in-page anchors
 *
 * ── Why it runs on read as well as write ──────────────────────────────────
 *
 * The rule stated at the top of normalise.ts. A row written by an older version,
 * or half-edited, degrades one node at a time rather than taking the page down —
 * and a node type retired from the union in a future version stops rendering
 * without needing a migration.
 *
 * `dropped` counts what did not survive, so the editor can say so instead of
 * quietly losing a paragraph behind a "Saved" badge.
 */
type Budget = { nodes: number; images: number; dropped: number };

function normaliseMarks(value: unknown): ArticleMark[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const marks: ArticleMark[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.type !== "string") continue;
    if (seen.has(entry.type)) continue;

    if (entry.type === "bold" || entry.type === "italic" || entry.type === "underline") {
      seen.add(entry.type);
      marks.push({ type: entry.type });
      continue;
    }

    if (entry.type === "link") {
      const attrs = isRecord(entry.attrs) ? entry.attrs : {};
      // An unusable href drops the MARK, not the text it was on — losing the
      // words because the address was wrong is not what anybody meant.
      const href = link(attrs.href, "");
      if (!href) continue;
      seen.add("link");
      marks.push({ type: "link", attrs: { href } });
    }
  }

  return marks.length > 0 ? marks : undefined;
}

function normaliseInline(value: unknown, budget: Budget): ArticleInline[] {
  if (!Array.isArray(value)) return [];

  const out: ArticleInline[] = [];

  for (const entry of value) {
    if (budget.nodes >= ARTICLE_BODY_MAX_NODES) break;
    if (!isRecord(entry)) continue;

    if (entry.type === "hardBreak") {
      budget.nodes += 1;
      out.push({ type: "hardBreak" });
      continue;
    }

    if (entry.type === "text" && typeof entry.text === "string") {
      const text = entry.text.slice(0, ARTICLE_LIMITS.text);
      // An empty run carries no information and its marks have nothing to mark.
      if (!text) continue;
      budget.nodes += 1;
      const marks = normaliseMarks(entry.marks);
      out.push(marks ? { type: "text", text, marks } : { type: "text", text });
      continue;
    }

    budget.dropped += 1;
  }

  return out;
}

function normaliseListItems(value: unknown, depth: number, budget: Budget): ArticleListItem[] {
  if (!Array.isArray(value)) return [];

  const items: ArticleListItem[] = [];

  for (const entry of value) {
    if (budget.nodes >= ARTICLE_BODY_MAX_NODES) break;
    if (!isRecord(entry) || entry.type !== "listItem") {
      budget.dropped += 1;
      continue;
    }

    budget.nodes += 1;
    const content = normaliseBlocks(entry.content, depth + 1, budget);
    // A bullet with nothing in it is a bullet nobody typed.
    if (content.length > 0) items.push({ type: "listItem", content });
  }

  return items;
}

function normaliseBlocks(value: unknown, depth: number, budget: Budget): ArticleNode[] {
  // Depth is bounded because the tree arrived as JSON from a browser and this
  // walk is recursive. Six is deeper than any list anybody nests on purpose.
  if (!Array.isArray(value) || depth > ARTICLE_MAX_DEPTH) return [];

  const out: ArticleNode[] = [];

  for (const entry of value) {
    if (budget.nodes >= ARTICLE_BODY_MAX_NODES) break;
    if (!isRecord(entry) || typeof entry.type !== "string") {
      budget.dropped += 1;
      continue;
    }

    const attrs = isRecord(entry.attrs) ? entry.attrs : {};

    switch (entry.type) {
      case "paragraph": {
        budget.nodes += 1;
        const content = normaliseInline(entry.content, budget);
        // An empty paragraph is kept: it is a deliberate gap between two others,
        // and the editor shows it as one.
        out.push(content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" });
        break;
      }

      case "heading": {
        budget.nodes += 1;
        const content = normaliseInline(entry.content, budget);
        // Anything outside 2–3 becomes a 2 rather than being dropped: the words
        // are the point and the level is a detail the writer can fix.
        const level = attrs.level === 3 ? 3 : 2;
        out.push(
          content.length > 0
            ? { type: "heading", attrs: { level }, content }
            : { type: "heading", attrs: { level } }
        );
        break;
      }

      case "blockquote": {
        budget.nodes += 1;
        const content = normaliseBlocks(entry.content, depth + 1, budget);
        if (content.length > 0) out.push({ type: "blockquote", content });
        break;
      }

      case "bulletList":
      case "orderedList": {
        budget.nodes += 1;
        const content = normaliseListItems(entry.content, depth, budget);
        if (content.length > 0) out.push({ type: entry.type, content });
        break;
      }

      case "image": {
        if (budget.images >= ARTICLE_MAX_IMAGES) {
          budget.dropped += 1;
          break;
        }
        // The one place an <img src> is decided. An unusable address drops the
        // whole node — an empty src renders as a broken image, which is worse
        // than no image, and is the same call `normaliseDeckPages` makes.
        const src = image(attrs.src, "");
        if (!src) {
          budget.dropped += 1;
          break;
        }
        budget.nodes += 1;
        budget.images += 1;
        out.push({
          type: "image",
          attrs: { src, alt: optionalText(attrs.alt, ARTICLE_LIMITS.alt) },
        });
        break;
      }

      case "horizontalRule": {
        budget.nodes += 1;
        out.push({ type: "horizontalRule" });
        break;
      }

      default:
        // The allowlist's fall-through. Everything not named above lands here.
        budget.dropped += 1;
    }
  }

  return out;
}

export function normaliseArticleBody(value: unknown, notes?: string[]): ArticleDoc {
  const record = isRecord(value) ? value : {};
  const budget: Budget = { nodes: 0, images: 0, dropped: 0 };
  const content = normaliseBlocks(record.content, 0, budget);

  if (budget.dropped > 0) {
    notes?.push(
      budget.dropped === 1
        ? "One thing in the article could not be stored and was removed."
        : `${budget.dropped} things in the article could not be stored and were removed.`
    );
  }

  if (budget.nodes >= ARTICLE_BODY_MAX_NODES) {
    notes?.push("The article reached its length limit and the end of it was cut off.");
  }

  return { type: "doc", content };
}

/* ─────────────────────── Reading a body back out ────────────────────── */

/** Whether there is anything to show. An empty paragraph is not something. */
export function articleIsEmpty(doc: ArticleDoc): boolean {
  return !doc.content.some((node) => {
    if (node.type === "image" || node.type === "horizontalRule") return true;
    if (node.type === "paragraph" || node.type === "heading") {
      return (node.content ?? []).some((inline) => inline.type === "text" && inline.text.trim());
    }
    return true;
  });
}

/**
 * The body as plain words, for a description when nobody wrote a subtext.
 *
 * Blocks are joined with a space rather than a newline: the result goes into a
 * `<meta>` tag and an OpenGraph description, neither of which has lines.
 */
export function articleText(doc: ArticleDoc, max = 300): string {
  const parts: string[] = [];

  const walk = (nodes: ArticleNode[]): void => {
    for (const node of nodes) {
      if (parts.join(" ").length >= max) return;

      if (node.type === "paragraph" || node.type === "heading") {
        for (const inline of node.content ?? []) {
          if (inline.type === "text") parts.push(inline.text);
        }
      } else if (node.type === "blockquote") {
        walk(node.content);
      } else if (node.type === "bulletList" || node.type === "orderedList") {
        for (const item of node.content) walk(item.content);
      }
    }
  };

  walk(doc.content);
  return parts.join(" ").replace(/\s+/g, " ").trim().slice(0, max);
}

/* ──────────────────────── Normalising the article ───────────────────── */

/**
 * Everything stored, read through its rules.
 *
 * `notes` collects anything that had to be CHANGED, so the editor can say so. An
 * address quietly rewritten behind a "Saved" badge is how somebody's printed link
 * stops working without anybody noticing — the deck's note, and it applies here
 * word for word.
 *
 * NOTE what this does NOT decide: whether the caller may write the `page` it
 * names. That is an authorisation question and it is answered in the route, by
 * `guardArticle`, against BOTH the stored page and the requested one.
 */
export function normaliseArticleInput(input: unknown, notes?: string[]): Omit<Article, "id"> {
  const record = isRecord(input) ? input : {};

  const title = optionalText(record.title, ARTICLE_LIMITS.title);
  const typed = optionalText(record.slug, ARTICLE_LIMITS.slug).toLowerCase();

  /*
   * The typed address, then a TIDIED version of it, and only then the title.
   * The middle step is what stops somebody who typed an address from being given
   * a completely different one — see the longer note on `normaliseDeckInput`.
   */
  const slug =
    usableSlug(typed) ||
    usableSlug(slugify(typed)) ||
    usableSlug(slugify(title)) ||
    fallbackSlug("article");

  if (typed && slug !== typed) {
    notes?.push(`The address was tidied up to “${slug}”.`);
  }

  return {
    title,
    slug,
    status: oneOf(record.status, ARTICLE_STATUSES, "draft"),
    page: articlePage(record.page),
    subtext: optionalText(record.subtext, ARTICLE_LIMITS.subtext),
    cover_image: image(record.cover_image, ""),
    published_at: isoDate(record.published_at),
    body: normaliseArticleBody(record.body, notes),
    // Every address it has ever answered to, minus the one it answers to now —
    // keeping the current slug in the list would make the redirect a loop.
    former_slugs: lines(record.former_slugs, 20, [])
      .map((entry) => entry.toLowerCase())
      .filter((entry) => isUsableSlug(entry) && entry !== slug),
    sort_order: typeof record.sort_order === "number" ? record.sort_order : 0,
  };
}
