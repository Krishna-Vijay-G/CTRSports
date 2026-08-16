/** `/calendar/<slug>` — one of the root site's seasons, or one round of one. */

import { CalendarEntry, calendarEntryMetadata } from "../../../_shell/pages/CalendarEntry";
import { requireModule, rootSite } from "../../../_shell/site";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const site = await rootSite();
  requireModule(site, "events");
  return calendarEntryMetadata(site, (await params).slug);
}

export default async function Page({ params }: Params) {
  const site = await rootSite();
  requireModule(site, "events");
  return <CalendarEntry site={site} slug={(await params).slug} />;
}
