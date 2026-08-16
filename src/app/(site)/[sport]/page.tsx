/**
 * A sport's own address, at `/<sport>`
 *
 * Everything this route does is in `SiteHome`, which the other tree's home page
 * uses too. Two files because Next needs a `page.tsx` per address; one component
 * because a site is a site.
 */

import { SiteHome, homeMetadata } from "../_shell/pages/SiteHome";
import { sportSite } from "../_shell/site";

export const revalidate = 60;

type Params = { params: Promise<{ sport: string }> };

export async function generateMetadata({ params }: Params) {
  const site = await sportSite((await params).sport);
  return homeMetadata(site);
}

export default async function Page({ params }: Params) {
  const site = await sportSite((await params).sport);
  return <SiteHome site={site} />;
}
