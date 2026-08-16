/**
 * The landing page, at `/`
 *
 * Everything this route does is in `SiteHome`, which the other tree's home page
 * uses too. Two files because Next needs a `page.tsx` per address; one component
 * because a site is a site.
 */

import { SiteHome, homeMetadata } from "../_shell/pages/SiteHome";
import { rootSite } from "../_shell/site";

export const revalidate = 60;

export async function generateMetadata() {
  const site = await rootSite();
  return homeMetadata(site);
}

export default async function Page() {
  const site = await rootSite();
  return <SiteHome site={site} />;
}
