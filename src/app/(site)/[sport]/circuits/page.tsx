/** `/<sport>/circuits` — the circuits this sport runs on. */

import { CircuitsIndex, circuitsMetadata } from "../../_shell/pages/CircuitsIndex";
import { requireModule, sportSite } from "../../_shell/site";

export const revalidate = 60;

type Params = { params: Promise<{ sport: string }> };

export async function generateMetadata({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "circuits");
  return circuitsMetadata(site);
}

export default async function Page({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "circuits");
  return <CircuitsIndex site={site} />;
}
