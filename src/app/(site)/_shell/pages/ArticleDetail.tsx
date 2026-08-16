import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { SITE } from "@/config/site";
import { articleHref } from "@/lib/articles";
import { richTextIsEmpty, richTextWords } from "@/lib/richtext";
import { getArticleBySlug } from "@/lib/server/articlesRepo";
import type { Site } from "@/lib/sites";
import { Reveal } from "@/components/ui/Reveal";
import { ArticleBody } from "../articles/ArticleBody";
import { ArticleHeader } from "../articles/ArticleHeader";
import { SiteShell } from "../SiteShell";

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
 * An article belongs to a site, and it is served under that site — an INCRC
 * article is at `/incrc/articles/<slug>` and nowhere else. Asking for one under
 * the wrong sport is a 404, not a redirect: the two are different addresses for
 * different things, and pretending otherwise would put every article at every
 * sport's address.
 *
 * Cached for a minute like the rest of the public site, and cleared on write —
 * see revalidateArticles.ts.
 */

export async function articleMetadata(site: Site, slug: string): Promise<Metadata> {
  const article = await getArticleBySlug(site.id, slug).catch(() => null);

  if (!article || article.status !== "published") return { title: "Not found" };

  const title = article.title || "Article";
  // The subtext is written to be this. Falling back to the opening words is
  // better than falling back to the site's own boilerplate, which would make
  // every article's search result identical.
  const description = article.subtext || richTextWords(article.body) || title;
  const cover = article.cover_image;

  return {
    title,
    description,
    alternates: { canonical: articleHref(site, article) },
    openGraph: {
      title,
      description,
      url: `${SITE.url}${articleHref(site, article)}`,
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

export async function ArticleDetail({ site, slug }: { site: Site; slug: string }) {
  // The throwing loader: a database that is down must be a 500, not a 404 a
  // crawler will believe.
  const article = await getArticleBySlug(site.id, slug);

  if (!article || article.status !== "published") notFound();
  if (article.slug !== slug) permanentRedirect(articleHref(site, article));

  const empty = richTextIsEmpty(article.body);

  return (
    <SiteShell site={site} year={new Date().getFullYear()}>
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
    </SiteShell>
  );
}
