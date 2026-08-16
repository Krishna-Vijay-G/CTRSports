/** `/articles/<slug>` — one article of this site's. */

import { ArticleDetail, articleMetadata } from "../../../_shell/pages/ArticleDetail";
import { requireModule, rootSite } from "../../../_shell/site";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const site = await rootSite();
  requireModule(site, "articles");
  return articleMetadata(site, (await params).slug);
}

export default async function Page({ params }: Params) {
  const site = await rootSite();
  requireModule(site, "articles");
  return <ArticleDetail site={site} slug={(await params).slug} />;
}
