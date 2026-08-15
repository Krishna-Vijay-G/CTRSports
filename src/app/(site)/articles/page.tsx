import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/config/site";
import { articleHref } from "@/lib/articles";
import { listPublishedArticles } from "@/lib/server/articlesRepo";
import { getLandingContent } from "@/lib/server/contentRepo";
import { sendAnchorsHome } from "@/lib/siteChrome";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Reveal } from "@/components/ui/Reveal";
import { articleDate } from "./_components/ArticleHeader";

/**
 * Everything that has been written, newest arrangement first.
 *
 * "First" is `sort_order`, set by dragging the admin's sidebar, not the date.
 * A date is what an article says about itself; the order is an editorial choice
 * about what should be read first, and the two are not the same — a season
 * preview stays at the top through the whole season.
 *
 * A published article of ANY page appears here. `page_key` decides who may edit
 * one, never who may read it.
 */

export const revalidate = 60;

const LOCAL_ANCHORS: string[] = [];

export const metadata: Metadata = {
  title: "Articles",
  description: `Reports, previews and announcements from ${SITE.name}.`,
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage() {
  const [articles, landing] = await Promise.all([listPublishedArticles(), getLandingContent()]);

  const chrome = sendAnchorsHome(landing, LOCAL_ANCHORS);

  return (
    <div id="top" className="min-h-screen bg-page p-2 sm:p-3">
      <div className="mx-auto max-w-[1920px] overflow-hidden rounded-card bg-surface">
        <main id="main-content">
          <SiteHeader
            content={chrome}
            home={false}
            className="relative z-20 border-b border-line bg-surface"
          />

          <section className="shell py-10 sm:py-14">
            <Reveal className="mx-auto mb-8 max-w-4xl sm:mb-10">
              <h1 className="headline text-[clamp(1.6rem,3.6vw,2.6rem)]">Articles</h1>
              <p className="body-copy mt-3">
                Reports, previews and announcements from across the championship.
              </p>
            </Reveal>

            {articles.length > 0 ? (
              <ul className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {articles.map((article) => {
                  const date = articleDate(article.published_at);

                  return (
                    <li key={article.id}>
                      <Reveal>
                        <Link
                          href={articleHref(article)}
                          className="panel-card group flex h-full flex-col overflow-hidden transition-colors hover:border-fg-muted/40"
                        >
                          {article.cover_image ? (
                            <img
                              src={article.cover_image}
                              alt=""
                              loading="lazy"
                              decoding="async"
                              className="block aspect-[16/9] w-full bg-panel object-cover"
                            />
                          ) : null}

                          <div className="flex flex-1 flex-col p-5">
                            {date ? (
                              <p className="mb-2 text-[12px] uppercase tracking-[0.14em] text-fg-muted">
                                {date}
                              </p>
                            ) : null}

                            <h2 className="headline text-lg">
                              {article.title || "Untitled article"}
                            </h2>

                            {article.subtext ? (
                              <p className="body-copy mt-2 text-[14px]">{article.subtext}</p>
                            ) : null}
                          </div>
                        </Link>
                      </Reveal>
                    </li>
                  );
                })}
              </ul>
            ) : (
              // Published-but-empty is a real state and it gets a sentence, not a
              // blank page — the same call every other route here makes.
              <div className="panel-card mx-auto max-w-2xl p-8 text-center sm:p-10">
                <p className="body-copy">Nothing has been published here yet. Please check back.</p>
              </div>
            )}
          </section>
        </main>

        <SiteFooter content={chrome} year={new Date().getFullYear()} />
      </div>
    </div>
  );
}
