import type { Metadata } from "next";
import Link from "next/link";
import { SITE } from "@/config/site";
import { articleDate, articleHref, articlesHref } from "@/lib/articles";
import { listPublishedArticles } from "@/lib/server/articlesRepo";
import type { Site } from "@/lib/sites";
import { Reveal } from "@/components/ui/Reveal";
import { SiteShell } from "../SiteShell";
import { Media } from "@/components/ui/Media";

/**
 * Everything that has been written, newest arrangement first.
 *
 * "First" is `sort_order`, set by dragging the admin's sidebar, not the date.
 * A date is what an article says about itself; the order is an editorial choice
 * about what should be read first, and the two are not the same — a season
 * preview stays at the top through the whole season.
 *
 * This site's published articles, and only this site's. An article belongs to
 * a sport now, and its address is under that sport — so the index of a sport's
 * writing is a different page from the landing site's, and both are this one.
 */

export function articlesMetadata(site: Site): Metadata {
  return {
    title: "Articles",
    description: `Reports, previews and announcements from ${SITE.name}.`,
    alternates: { canonical: articlesHref(site) },
  };
}

export async function ArticlesIndex({ site }: { site: Site }) {
  const articles = await listPublishedArticles(site.id);

  return (
    <SiteShell site={site} year={new Date().getFullYear()}>
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
                          href={articleHref(site, article)}
                          className="panel-card group flex h-full flex-col overflow-hidden transition-colors hover:border-fg-muted/40"
                        >
                          {article.cover_image ? (
                            <Media
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
    </SiteShell>
  );
}
