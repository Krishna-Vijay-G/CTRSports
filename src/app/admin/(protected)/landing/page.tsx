import { getLandingContent } from "@/lib/server/contentRepo";
import { listAllSports } from "@/lib/server/sportsRepo";
import { LandingEditor } from "./_components/LandingEditor";

export const dynamic = "force-dynamic";

/**
 * The whole landing page, edited on one screen — the page document and the sport
 * cards together, because they make up one page and are read side by side.
 *
 * Deliberately uses the throwing loaders, not the safe ones: an editor that
 * quietly showed the defaults after a failed read would let someone "save" them
 * straight over the real content.
 */
export default async function LandingAdminPage() {
  const [content, sports] = await Promise.all([getLandingContent(), listAllSports()]);

  return (
    <LandingEditor
      initialContent={content}
      initialSports={sports}
      year={new Date().getFullYear()}
    />
  );
}
