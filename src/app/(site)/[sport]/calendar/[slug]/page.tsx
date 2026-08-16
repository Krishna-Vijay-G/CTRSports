/** `/<sport>/calendar/<slug>` — one event. */

import { EventDetail, eventMetadata } from "../../../_shell/pages/EventDetail";
import { requireModule, sportSite } from "../../../_shell/site";

export const revalidate = 60;

type Params = { params: Promise<{ sport: string; slug: string }> };

export async function generateMetadata({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "events");
  return eventMetadata(site, (await params).slug);
}

export default async function Page({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "events");
  return <EventDetail site={site} slug={(await params).slug} />;
}
