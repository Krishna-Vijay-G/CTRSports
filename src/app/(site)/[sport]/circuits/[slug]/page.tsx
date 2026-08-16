/** `/<sport>/circuits/<slug>` — one circuit. */

import { CircuitDetailPage, circuitMetadata } from "../../../_shell/pages/CircuitDetailPage";
import { requireModule, sportSite } from "../../../_shell/site";

export const revalidate = 60;

type Params = { params: Promise<{ sport: string; slug: string }> };

export async function generateMetadata({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "circuits");
  return circuitMetadata(site, (await params).slug);
}

export default async function Page({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "circuits");
  return <CircuitDetailPage site={site} slug={(await params).slug} />;
}
