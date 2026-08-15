import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { SITE } from "@/config/site";
import { articleHref, articleIsEmpty, articleText } from "@/lib/articles";
import { getArticleBySlug } from "@/lib/server/articlesRepo";
import { getLandingContent } from "@/lib/server/contentRepo";
import { sendAnchorsHome } from "@/lib/siteChrome";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Reveal } from "@/components/ui/Reveal";
import { ArticleBody } from "../_components/ArticleBody";
import { ArticleHeader } from "../_components/ArticleHeader";

/**
 * One article, at its own address.
 *
 * ── Three states, the same three a deck has ───────────────────────────────
 *
 *   missing or draft   404. A draft is not on the internet, and "this exists
 *                      but you cannot see it" is a way of putting it there.
 *   a former address   a permanent redirect to the current one, so a printed
 *                      link corrects itself rather than dying.
 *   nothing written    the heading and a line saying so. A published article with
 *                      an empty body is somebody halfway through the job, and a
 *                      blank page reads as a broken one.
 *
 * Note what is NOT one of the states: the page it belongs to. `page_key` decides
 * who may EDIT an article, not who may read one — every published article is at
 * its own address for anybody, which is the entire reason it is a row with a slug
 * rather than a section of a page.
 *
 * Cached for a minute like the rest of the public site, and cleared on write —
 * see revalidateArticles.ts.
 */

export const revalidate = 60;

/** Nothing on this page is an anchor — every nav link goes home. */
const LOCAL_ANCHORS: string[] = [];

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug).catch(() => null);

  if (!article || article.status !== "published") return { title: "Not found" };

  const title = article.title || "Article";
  // The subtext is written to be this. Falling back to the opening words is
  // better than falling back to the site's own boilerplate, which would make
  // every article's search result identical.
  const description = article.subtext || articleText(article.body) || title;
  const cover = article.cover_image;

  return {
    title,
    description,
    alternates: { canonical: articleHref(article) },
    openGraph: {
      title,
      description,
      url: `${SITE.url}${articleHref(article)}`,
      siteName: SITE.name,
      type: "article",
      locale: SITE.locale,
      ...(article.published_at ? { publishedTime: article.published_at } : {}),
      // Only when it is an absolute address: a cover can be a /public path, and a
      // relative URL in a card preview resolves against the crawler's own host.
      ...(cover && cover.startsWith("http") ? { images: [{ url: cover }] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: Params) {
  const { slug } = await params;

  const [article, landing] = await Promise.all([
    // The throwing loader: a database that is down must be a 500, not a 404 a
    // crawler will believe.
    getArticleBySlug(slug),
    getLandingContent(),
  ]);

  if (!article || article.status !== "published") notFound();
  if (article.slug !== slug) permanentRedirect(articleHref(article));

  const chrome = sendAnchorsHome(landing, LOCAL_ANCHORS);
  const empty = articleIsEmpty(article.body);

  return (
    <div id="top" className="min-h-screen bg-page p-2 sm:p-3">
      <div className="mx-auto max-w-[1920px] overflow-hidden rounded-card bg-surface">
        <main id="main-content">
          {/* `home={false}` is what puts Back in the header — the one control
              somebody who arrived here from a shared link actually wants. */}
          <SiteHeader
            content={chrome}
            home={false}
            className="relative z-20 border-b border-line bg-surface"
          />

          <article className="shell py-10 sm:py-14">
            <Reveal>
              <ArticleHeader article={article} />
            </Reveal>

            {empty ? (
              <div className="panel-card mx-auto mt-8 max-w-2xl p-8 text-center sm:p-10">
                <p className="body-copy">Nothing has been written here yet. Please check back.</p>
              </div>
            ) : (
              <ArticleBody doc={article.body} className="mt-8" />
            )}
          </article>
        </main>

        <SiteFooter content={chrome} year={new Date().getFullYear()} />
      </div>
    </div>
  );
}
