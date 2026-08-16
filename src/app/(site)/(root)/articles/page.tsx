/** `/articles` — this site's published writing. */

import { ArticlesIndex, articlesMetadata } from "../../_shell/pages/ArticlesIndex";
import { requireModule, rootSite } from "../../_shell/site";

export const revalidate = 60;

export async function generateMetadata() {
  const site = await rootSite();
  requireModule(site, "articles");
  return articlesMetadata(site);
}

export default async function Page() {
  const site = await rootSite();
  requireModule(site, "articles");
  return <ArticlesIndex site={site} />;
}
