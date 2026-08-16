import { SITE } from "@/config/site";
import { requireSite } from "@/lib/server/access";
import { listArticles } from "@/lib/server/articlesRepo";
import { getChrome } from "@/lib/server/contentRepo";
import { ArticlesEditor } from "@/admin/screens/articles/ArticlesEditor";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ sport: string }> };

/**
 * One sport's articles.
 *
 * `listArticles` takes the session as well as the site: the site narrows the
 * rows to this sport, and the session is the backstop that narrows them to what
 * the account may open at all. Passing both means a mistyped site in the URL
 * cannot widen the list — the layout has already refused a sport this account
 * cannot reach, and this refuses it a second time in SQL.
 */
export default async function ArticlesAdminPage({ params }: Props) {
  const { sport } = await params;
  const { session, site } = await requireSite(sport, "articles");

  const [articles, chrome] = await Promise.all([
    listArticles(session, site.id),
    getChrome(site),
  ]);

  return (
    <ArticlesEditor
      initialArticles={articles}
      chrome={chrome}
      siteUrl={SITE.url}
      year={new Date().getFullYear()}
    />
  );
}
