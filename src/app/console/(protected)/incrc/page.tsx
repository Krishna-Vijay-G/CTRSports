import { requirePage } from "@/lib/server/access";
import { getIncrcContent, getLandingContent } from "@/lib/server/contentRepo";
import { listDeckSummariesSafe } from "@/lib/server/decksRepo";
import { listFormsForPage } from "@/lib/server/formsRepo";
import { listTracks } from "@/lib/server/tracksRepo";
import { IncrcEditor } from "@/admin/screens/incrc/IncrcEditor";

export const dynamic = "force-dynamic";

/**
 * The whole /incrc page, edited on one screen.
 *
 * The landing document comes along read-only: it supplies the header and footer
 * the preview needs, so what is on screen is the real page rather than a body
 * with nothing around it. It is edited at /admin/landing.
 *
 * Deliberately uses the throwing loaders, not the safe ones: an editor that
 * quietly showed the defaults after a failed read would let someone "save" them
 * straight over the real content.
 */
export default async function IncrcAdminPage() {
  await requirePage("incrc");

  const [content, chrome, tracks, forms, decks] = await Promise.all([
    getIncrcContent(),
    getLandingContent(),
    listTracks(),
    listFormsForPage("incrc"),
    // The safe loader, unlike the two above: the decks are a list to PICK from,
    // not content this screen could overwrite. An unreachable decks table costs
    // the picker its options and nothing else.
    listDeckSummariesSafe(),
  ]);

  return (
    <IncrcEditor
      initialContent={content}
      chrome={chrome}
      tracks={tracks}
      forms={forms}
      decks={decks}
      year={new Date().getFullYear()}
    />
  );
}
