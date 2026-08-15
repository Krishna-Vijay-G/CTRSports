import { SITE } from "@/config/site";
import { requirePage } from "@/lib/server/access";
import { getLandingContent } from "@/lib/server/contentRepo";
import { listDecks } from "@/lib/server/decksRepo";
import { DecksEditor } from "@/admin/screens/decks/DecksEditor";

export const dynamic = "force-dynamic";

/**
 * The decks, on a screen of their own.
 *
 * Not part of any page's editor, for the reason the circuits are not: a deck
 * belongs to nobody. It is published at its own address whether or not anything
 * links to it, and several pages can point at the same one.
 *
 * Deliberately uses the throwing loader for the decks themselves: an editor
 * that quietly showed an empty list after a failed read would invite someone to
 * upload the same fifty pages a second time. The landing document beside it is
 * only there for the preview's header and footer, so it falls back rather than
 * taking the screen down.
 */
export default async function DecksAdminPage() {
  await requirePage("decks");

  const [decks, chrome] = await Promise.all([listDecks(), getLandingContent()]);

  /*
   * The public origin, handed down rather than imported by the editor.
   *
   * The admin answers on its own hostname, so a relative link to /deck/<slug>
   * from an admin screen resolves against the ADMIN host, where the public
   * routes do not exist — it would 404. SITE.url is built from an environment
   * variable that is not NEXT_PUBLIC, so it is only readable on the server;
   * reading it inside the client component would quietly give localhost.
   */
  return (
    <DecksEditor
      initialDecks={decks}
      chrome={chrome}
      siteUrl={SITE.url}
      year={new Date().getFullYear()}
    />
  );
}
