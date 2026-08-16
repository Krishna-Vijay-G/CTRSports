/** `/<sport>/calendar` — sends you to whichever season is running. */

import { sendToCurrentSeason } from "../../_shell/pages/CalendarIndex";
import { requireModule, sportSite } from "../../_shell/site";

export const revalidate = 60;

type Params = { params: Promise<{ sport: string }> };

export default async function Page({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "events");
  return sendToCurrentSeason(site);
}
