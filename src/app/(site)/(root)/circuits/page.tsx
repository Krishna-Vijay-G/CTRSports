/** `/circuits` — the circuits this sport runs on. */

import { CircuitsIndex, circuitsMetadata } from "../../_shell/pages/CircuitsIndex";
import { requireModule, rootSite } from "../../_shell/site";

export const revalidate = 60;

export async function generateMetadata() {
  const site = await rootSite();
  requireModule(site, "circuits");
  return circuitsMetadata(site);
}

export default async function Page() {
  const site = await rootSite();
  requireModule(site, "circuits");
  return <CircuitsIndex site={site} />;
}
