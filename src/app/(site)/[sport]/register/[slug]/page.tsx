/** `/<sport>/register/<slug>` — one entry form. */

import { RegisterDetail, registerMetadata } from "../../../_shell/pages/RegisterDetail";
import { requireModule, sportSite } from "../../../_shell/site";

/* Never cached — see the note in RegisterDetail. */
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ sport: string; slug: string }> };

export async function generateMetadata({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "forms");
  return registerMetadata(site, (await params).slug);
}

export default async function Page({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "forms");
  return <RegisterDetail site={site} slug={(await params).slug} />;
}
