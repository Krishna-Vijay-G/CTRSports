/** `/calendar` — the root site's season, if it runs one. */

import { sendToCurrentSeason } from "../../_shell/pages/CalendarIndex";
import { requireModule, rootSite } from "../../_shell/site";

export const revalidate = 60;

export default async function Page() {
  const site = await rootSite();
  requireModule(site, "events");
  return sendToCurrentSeason(site);
}
