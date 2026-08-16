/** `/<sport>/calendar/<slug>` — a season, or one round of one. */

import { CalendarEntry, calendarEntryMetadata } from "../../../_shell/pages/CalendarEntry";
import { requireModule, sportSite } from "../../../_shell/site";

export const revalidate = 60;

type Params = { params: Promise<{ sport: string; slug: string }> };

export async function generateMetadata({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "events");
  return calendarEntryMetadata(site, (await params).slug);
}

export default async function Page({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "events");
  return <CalendarEntry site={site} slug={(await params).slug} />;
}
