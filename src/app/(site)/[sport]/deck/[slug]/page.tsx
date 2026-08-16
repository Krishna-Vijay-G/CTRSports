/** `/<sport>/deck/<slug>` — one deck, page by page. */

import { DeckDetail, deckMetadata } from "../../../_shell/pages/DeckDetail";
import { requireModule, sportSite } from "../../../_shell/site";

export const revalidate = 60;

type Params = { params: Promise<{ sport: string; slug: string }> };

export async function generateMetadata({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "decks");
  return deckMetadata(site, (await params).slug);
}

export default async function Page({ params }: Params) {
  const site = await sportSite((await params).sport);
  requireModule(site, "decks");
  return <DeckDetail site={site} slug={(await params).slug} />;
}
