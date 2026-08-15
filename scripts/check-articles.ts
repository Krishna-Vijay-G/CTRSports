/**
 * An article's rules, checked.
 *
 *   npm run check:articles
 *
 * Larger than the deck's checks, because an article carries something no other
 * record in this project does: a DOCUMENT that arrived as JSON from a browser.
 * `normaliseArticleBody` is the only thing standing between that and the public
 * renderer, and unlike every other normaliser here its failure mode is not a
 * missing field — it is markup on a page.
 *
 * So most of what follows is adversarial. The rule being pinned down is that the
 * body is an ALLOWLIST: a node type not named in `ArticleNode` is dropped rather
 * than passed through, and the two attributes that are addresses go through the
 * same `image()` and `link()` every other URL in this project does.
 *
 * No database and no network. What this cannot check is the SQL or the screens.
 */

import {
  ARTICLE_BODY_MAX_NODES,
  ARTICLE_MAX_IMAGES,
  articleIsEmpty,
  articleText,
  normaliseArticleBody,
  normaliseArticleInput,
  type ArticleNode,
} from "@/lib/articles";
import { isUsableSlug } from "@/lib/slug";

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

/** One paragraph of runs, which is what most of these are testing. */
function para(runs: unknown[]): unknown {
  return { type: "paragraph", content: runs };
}

function linked(text: string, href: string): unknown {
  return { type: "text", text, marks: [{ type: "link", attrs: { href } }] };
}

/** Whether the run with this text came back still carrying a link. */
function hasLink(nodes: ArticleNode[], text: string): boolean {
  const paragraph = nodes.find((node) => node.type === "paragraph");
  if (!paragraph || paragraph.type !== "paragraph") return false;

  const run = (paragraph.content ?? []).find(
    (inline) => inline.type === "text" && inline.text === text
  );
  return run?.type === "text" && (run.marks ?? []).some((mark) => mark.type === "link");
}

/* ─────────────────────────── Addresses in a body ────────────────────────── */

section("An image address is decided by image(), and only by it");
{
  const doc = normaliseArticleBody({
    type: "doc",
    content: [
      { type: "image", attrs: { src: "javascript:alert(1)", alt: "" } },
      // Protocol-relative: starts with a slash and is NOT a path on this site.
      { type: "image", attrs: { src: "//evil.example.com/a.png", alt: "" } },
      { type: "image", attrs: { src: "", alt: "" } },
      { type: "image", attrs: { src: "https://cdn.example.com/ok.webp", alt: "A wet grid" } },
      { type: "image", attrs: { src: "/placeholder.png", alt: "" } },
    ],
  });

  const sources = doc.content
    .filter((node): node is Extract<ArticleNode, { type: "image" }> => node.type === "image")
    .map((node) => node.attrs.src);

  check("only the two usable ones survive", sources, [
    "https://cdn.example.com/ok.webp",
    "/placeholder.png",
  ]);
  check("alt text is carried", (doc.content[0] as { attrs: { alt: string } }).attrs.alt, "A wet grid");
}

section("A link address is decided by link(), and only by it");
{
  const doc = normaliseArticleBody({
    type: "doc",
    content: [
      para([
        linked("script", "javascript:alert(1)"),
        linked("relative", "//evil.example.com"),
        linked("data", "data:text/html,<script>alert(1)</script>"),
        linked("https", "https://example.com"),
        linked("anchor", "#entry"),
        linked("path", "/circuits"),
      ]),
    ],
  });

  check("javascript: is refused", hasLink(doc.content, "script"), false);
  check("protocol-relative is refused", hasLink(doc.content, "relative"), false);
  check("data: is refused", hasLink(doc.content, "data"), false);
  check("https is kept", hasLink(doc.content, "https"), true);
  check("an anchor is kept", hasLink(doc.content, "anchor"), true);
  check("a path on this site is kept", hasLink(doc.content, "path"), true);

  /*
   * The refusal drops the MARK and keeps the WORDS. Dropping the run as well
   * would silently delete a sentence because the address on it was wrong, which
   * is the kind of loss somebody only finds after publishing.
   */
  const paragraph = doc.content[0] as { content: { text: string }[] };
  check("the words survive a refused address", paragraph.content.length, 6);
}

/* ──────────────────────────── The allowlist ─────────────────────────────── */

section("A node type not in the union is dropped, never passed through");
{
  const notes: string[] = [];
  const doc = normaliseArticleBody(
    {
      type: "doc",
      content: [
        { type: "script", attrs: { src: "https://evil.example.com/x.js" } },
        { type: "iframe", attrs: { src: "https://evil.example.com" } },
        { type: "html", content: [{ type: "text", text: "<img onerror=alert(1)>" }] },
        // Real ProseMirror nodes that StarterKit knows and this schema does not.
        { type: "codeBlock", content: [{ type: "text", text: "x" }] },
        { type: "table", content: [] },
        para([{ type: "text", text: "kept" }]),
      ],
    },
    notes
  );

  check("only the paragraph is left", doc.content.length, 1);
  check("and it is the right one", doc.content[0].type, "paragraph");
  check("five drops were reported", notes.length, 1);
  check("the note says how many", notes[0], "5 things in the article could not be stored and were removed.");
}

section("A mark not in the union is dropped, and the run keeps the rest");
{
  const doc = normaliseArticleBody({
    type: "doc",
    content: [
      para([
        {
          type: "text",
          text: "mixed",
          marks: [{ type: "onclick" }, { type: "bold" }, { type: "highlight" }, { type: "italic" }],
        },
      ]),
    ],
  });

  const run = (doc.content[0] as { content: { marks: { type: string }[] }[] }).content[0];
  check("only the known marks remain", run.marks.map((mark) => mark.type), ["bold", "italic"]);
}

section("Headings are levels 2 and 3, because the page prints the title as H1");
{
  const doc = normaliseArticleBody({
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "a" }] },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "b" }] },
      { type: "heading", attrs: { level: 6 }, content: [{ type: "text", text: "c" }] },
      { type: "heading", content: [{ type: "text", text: "d" }] },
    ],
  });

  const levels = doc.content.map((node) =>
    node.type === "heading" ? node.attrs.level : null
  );
  // Anything outside 2–3 becomes a 2 rather than being dropped: the words are
  // the point and the level is a detail the writer can fix.
  check("everything outside 2–3 becomes a 2", levels, [2, 3, 2, 2]);
}

/* ───────────────────────────── The budgets ──────────────────────────────── */

section("A body that arrived as JSON cannot exhaust the server");
{
  let deep: unknown = para([{ type: "text", text: "bottom" }]);
  for (let index = 0; index < 40; index += 1) deep = { type: "blockquote", content: [deep] };

  const doc = normaliseArticleBody({ type: "doc", content: [deep] });
  check("runaway nesting is truncated, not followed", JSON.stringify(doc).includes("bottom"), false);
}

{
  const many = Array.from({ length: ARTICLE_MAX_IMAGES + 25 }, (_, index) => ({
    type: "image",
    attrs: { src: `https://cdn.example.com/${index}.webp`, alt: "" },
  }));

  const doc = normaliseArticleBody({ type: "doc", content: many });
  check(
    `the image cap holds at ${ARTICLE_MAX_IMAGES}`,
    doc.content.filter((node) => node.type === "image").length,
    ARTICLE_MAX_IMAGES
  );
}

{
  const many = Array.from({ length: ARTICLE_BODY_MAX_NODES + 500 }, () =>
    para([{ type: "text", text: "x" }])
  );

  const notes: string[] = [];
  const doc = normaliseArticleBody({ type: "doc", content: many }, notes);
  check("the node cap holds", doc.content.length <= ARTICLE_BODY_MAX_NODES, true);
  check(
    "and the cut-off is said out loud",
    notes.some((note) => note.includes("length limit")),
    true
  );
}

section("A document that is not one still reads as an empty document");
{
  for (const bad of [null, undefined, 42, "a string", [], { type: "doc" }, { content: "nope" }]) {
    const doc = normaliseArticleBody(bad);
    check(`${JSON.stringify(bad) ?? "undefined"} → an empty doc`, doc, { type: "doc", content: [] });
  }

  check("and that reads as empty", articleIsEmpty(normaliseArticleBody(null)), true);
  check("a paragraph of nothing is still empty", articleIsEmpty(normaliseArticleBody({
    type: "doc",
    content: [para([]), para([{ type: "text", text: "   " }])],
  })), true);
  check("one word is not", articleIsEmpty(normaliseArticleBody({
    type: "doc",
    content: [para([{ type: "text", text: "Rain." }])],
  })), false);
}

/* ────────────────────────── Which page owns one ─────────────────────────── */

section("An unrecognised page reads as null, which is the STRICT answer");
{
  // Null means "every page" and takes the owner. Reading an unknown value as
  // null therefore makes it MORE restricted, never less — the same posture
  // `normaliseRole` takes.
  check("a missing page", normaliseArticleInput({}).page, null);
  check("an unknown page", normaliseArticleInput({ page: "wat" }).page, null);
  check("a non-string page", normaliseArticleInput({ page: 7 }).page, null);
  check("'articles' is not a PageKey", normaliseArticleInput({ page: "articles" }).page, null);
  check("a real one survives", normaliseArticleInput({ page: "incrc" }).page, "incrc");
}

/* ──────────────────────────────── The rest ──────────────────────────────── */

section("An article always gets a usable address");
{
  const titled = normaliseArticleInput({ title: "Season Opener at Kari" });
  check("made from the title when none is typed", titled.slug, "season-opener-at-kari");

  const typed = normaliseArticleInput({ title: "Season Opener", slug: "opener" });
  check("a typed address is kept", typed.slug, "opener");

  const notes: string[] = [];
  const messy = normaliseArticleInput({ title: "Opener", slug: "Season Opener!" }, notes);
  check("a messy one is tidied to itself, not to the title", messy.slug, "season-opener");
  check("and that is reported", notes.length, 1);

  const nothing = normaliseArticleInput({ title: "日本レース" });
  check("a title with no letters still gets one", isUsableSlug(nothing.slug), true);
}

{
  // Keeping the current slug among the former ones would make the redirect a
  // loop, exactly as it would for a deck.
  const looped = normaliseArticleInput({
    title: "Opener",
    slug: "opener",
    former_slugs: ["opener", "old-opener", "NOT A SLUG"],
  });
  check("the current address is not also a former one", looped.former_slugs, ["old-opener"]);
}

section("The fields around the words");
{
  check("a javascript: cover is refused", normaliseArticleInput({ cover_image: "javascript:x" }).cover_image, "");
  check("a protocol-relative cover is refused", normaliseArticleInput({ cover_image: "//evil.example.com/a.png" }).cover_image, "");
  check("a real cover is kept", normaliseArticleInput({ cover_image: "https://cdn.example.com/a.webp" }).cover_image, "https://cdn.example.com/a.webp");

  check("an impossible date is refused", normaliseArticleInput({ published_at: "2026-02-31" }).published_at, "");
  check("a malformed date is refused", normaliseArticleInput({ published_at: "15/08/2026" }).published_at, "");
  check("a real date is kept", normaliseArticleInput({ published_at: "2026-08-15" }).published_at, "2026-08-15");

  check("an unknown status falls back to draft", normaliseArticleInput({ status: "live" }).status, "draft");
  check("published is kept", normaliseArticleInput({ status: "published" }).status, "published");
}

section("The body read back as words, for a description");
{
  const doc = normaliseArticleBody({
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Wet race" }] },
      para([{ type: "text", text: "It rained   all  weekend." }]),
      { type: "image", attrs: { src: "https://cdn.example.com/a.webp", alt: "not prose" } },
    ],
  });

  check("runs are joined and whitespace collapsed", articleText(doc), "Wet race It rained all weekend.");
  check("alt text is not prose", articleText(doc).includes("not prose"), false);
  check("it is capped", articleText(doc, 8).length <= 8, true);
}

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
