/** `/<sport>/articles` — this site's published writing. */

import { ArticlesIndex, articlesMetadata } from "../../_shell/pages/ArticlesIndex";
import { requireModule, sportSite } from "../../_shell/site";

export const revalidate = 60;

type Params = { params: Promise<{ sport: string }> };

export async function generateMetadata({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "articles");
  return articlesMetadata(site);
}

export default async function Page({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "articles");
  return <ArticlesIndex site={site} />;
}
