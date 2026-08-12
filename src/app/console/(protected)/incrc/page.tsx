import { getIncrcContent, getLandingContent } from "@/lib/server/contentRepo";
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
  const [content, chrome, tracks] = await Promise.all([
    getIncrcContent(),
    getLandingContent(),
    listTracks(),
  ]);

  return (
    <IncrcEditor
      initialContent={content}
      chrome={chrome}
      tracks={tracks}
      year={new Date().getFullYear()}
    />
  );
}
