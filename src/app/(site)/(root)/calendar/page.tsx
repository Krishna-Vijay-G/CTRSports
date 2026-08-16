/** `/calendar` — the root site's season, if it runs one. */

import { CalendarIndex, calendarMetadata } from "../../_shell/pages/CalendarIndex";
import { requireModule, rootSite } from "../../_shell/site";

export const revalidate = 60;

export async function generateMetadata() {
  const site = await rootSite();
  requireModule(site, "events");
  return calendarMetadata(site);
}

export default async function Page() {
  const site = await rootSite();
  requireModule(site, "events");
  return <CalendarIndex site={site} />;
}
