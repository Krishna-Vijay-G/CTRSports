/** `/calendar/<slug>` — one of the root site's events. */

import { EventDetail, eventMetadata } from "../../../_shell/pages/EventDetail";
import { requireModule, rootSite } from "../../../_shell/site";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const site = await rootSite();
  requireModule(site, "events");
  return eventMetadata(site, (await params).slug);
}

export default async function Page({ params }: Params) {
  const site = await rootSite();
  requireModule(site, "events");
  return <EventDetail site={site} slug={(await params).slug} />;
}
