/** `/deck/<slug>` — one deck, page by page. */

import { DeckDetail, deckMetadata } from "../../../_shell/pages/DeckDetail";
import { requireModule, rootSite } from "../../../_shell/site";

export const revalidate = 60;

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const site = await rootSite();
  requireModule(site, "decks");
  return deckMetadata(site, (await params).slug);
}

export default async function Page({ params }: Params) {
  const site = await rootSite();
  requireModule(site, "decks");
  return <DeckDetail site={site} slug={(await params).slug} />;
}
