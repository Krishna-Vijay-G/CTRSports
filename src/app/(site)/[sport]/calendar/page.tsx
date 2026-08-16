/** `/<sport>/calendar` — this sport's season. */

import { CalendarIndex, calendarMetadata } from "../../_shell/pages/CalendarIndex";
import { requireModule, sportSite } from "../../_shell/site";

export const revalidate = 60;

type Params = { params: Promise<{ sport: string }> };

export async function generateMetadata({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "events");
  return calendarMetadata(site);
}

export default async function Page({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "events");
  return <CalendarIndex site={site} />;
}
