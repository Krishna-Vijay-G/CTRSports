import { SITE } from "@/config/site";
import { requireAnyPage } from "@/lib/server/access";
import { listArticles } from "@/lib/server/articlesRepo";
import { getLandingContent } from "@/lib/server/contentRepo";
import { ArticlesEditor } from "@/admin/screens/articles/ArticlesEditor";

/**
 * The writing screen.
 *
 * `requireAnyPage` rather than `requirePage`, for the reason the media library
 * gives: articles are not a fifth page editor, they are something every page
 * editor has. What narrows the screen is the LIST — `listArticles` returns only
 * the articles this account may open, and the routes behind it check again.
 *
 * The scope is passed down because the fields need it: only an owner may write an
 * article for all pages, and the "Appears on" control must not offer an option
 * the server would refuse.
 */

export const dynamic = "force-dynamic";

export default async function ArticlesAdminPage() {
  const session = await requireAnyPage();

  const [articles, chrome] = await Promise.all([listArticles(session), getLandingContent()]);

  return (
    <ArticlesEditor
      initialArticles={articles}
      scope={{ role: session.role, pages: session.pages }}
      chrome={chrome}
      siteUrl={SITE.url}
      year={new Date().getFullYear()}
    />
  );
}
