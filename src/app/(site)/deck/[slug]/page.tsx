import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { SITE } from "@/config/site";
import { deckHref } from "@/lib/decks";
import { getDeckBySlug } from "@/lib/server/decksRepo";
import { getLandingContentSafe } from "@/lib/server/contentRepo";
import { sendAnchorsHome } from "@/lib/siteChrome";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Reveal } from "@/components/ui/Reveal";
import { DeckPages } from "../_components/DeckPages";

/**
 * One deck, at its own address.
 *
 * A run of images, top to bottom, with the site's own header and footer around
 * them — which is the whole point of it being here rather than a PDF on a file
 * host: somebody who arrives from a poster or a shared link lands on the site,
 * with a way back into it and the footer's contact details under them.
 *
 * ── Three states, the same three a form has ───────────────────────────────
 *
 *   missing or draft   404. A draft is not on the internet, and "this exists
 *                      but you cannot see it" is a way of putting it there.
 *   a former address   a permanent redirect to the current one, so a printed
 *                      link corrects itself rather than dying.
 *   no pages yet       the heading and a line saying so. A published deck with
 *                      nothing in it is somebody halfway through the job, and a
 *                      blank page reads as a broken one.
 *
 * Cached for a minute like the rest of the public site, and cleared on write —
 * see revalidateDecks.ts. A deck is fifty images; making the page dynamic to
 * catch an edit nobody has made would be paying for it on every view.
 */

export const revalidate = 60;

/** Nothing on this page is an anchor — every nav link goes home. */
const LOCAL_ANCHORS: string[] = [];

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const deck = await getDeckBySlug(slug).catch(() => null);

  if (!deck || deck.status !== "published") return { title: "Not found" };

  const title = deck.name || "Deck";
  const description = deck.blurb || `${deck.name}, page by page.`;
  const cover = deck.pages[0]?.url;

  return {
    title,
    description,
    alternates: { canonical: deckHref(deck) },
    openGraph: {
      title,
      description,
      url: `${SITE.url}${deckHref(deck)}`,
      siteName: SITE.name,
      type: "article",
      locale: SITE.locale,
      // Only when it is an absolute address: a deck page can be a /public path,
      // and a relative URL in a card preview resolves against the crawler's own
      // host rather than ours.
      ...(cover && cover.startsWith("http") ? { images: [{ url: cover }] } : {}),
    },
  };
}

export default async function DeckPage({ params }: Params) {
  const { slug } = await params;

  const [deck, landing] = await Promise.all([
    // The throwing loader, for the reason /circuits/[slug] gives: a database
    // that is down must be a 500, not a 404 a crawler will believe.
    getDeckBySlug(slug),
    getLandingContentSafe(),
  ]);

  if (!deck || deck.status !== "published") notFound();
  if (deck.slug !== slug) permanentRedirect(deckHref(deck));

  const chrome = sendAnchorsHome(landing, LOCAL_ANCHORS);
  const heading = deck.show_heading && (deck.name || deck.blurb);

  return (
    <div id="top" className="min-h-screen bg-page p-2 sm:p-3">
      {/* Same shell as every other route: the page colour showing around one
          rounded card, capped at 1920 so a full-HD window is filled. */}
      <div className="mx-auto max-w-[1920px] overflow-hidden rounded-card bg-surface">
        <main id="main-content">
          {/* `home={false}` is what puts Back in the header — the one control
              somebody who arrived here from a link on /incrc actually wants. */}
          <SiteHeader
            content={chrome}
            home={false}
            className="relative z-20 border-b border-line bg-surface"
          />

          <section className="shell py-10 sm:py-14">
            {heading ? (
              <Reveal className="mx-auto mb-8 max-w-4xl sm:mb-10">
                {deck.name ? (
                  <h1 className="headline text-[clamp(1.6rem,3.6vw,2.6rem)]">{deck.name}</h1>
                ) : null}

                {deck.blurb ? <p className="body-copy mt-3">{deck.blurb}</p> : null}
              </Reveal>
            ) : (
              // A deck whose first page is its own cover prints no heading, so
              // the page needs its name somewhere a screen reader will find it.
              <h1 className="sr-only">{deck.name || "Deck"}</h1>
            )}

            {deck.pages.length > 0 ? (
              <DeckPages deck={deck} />
            ) : (
              <div className="panel-card mx-auto max-w-2xl p-8 text-center sm:p-10">
                <p className="body-copy">There is nothing in this deck yet. Please check back.</p>
              </div>
            )}
          </section>
        </main>

        <SiteFooter content={chrome} year={new Date().getFullYear()} />
      </div>
    </div>
  );
}
