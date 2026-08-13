import { requirePage } from "@/lib/server/access";
import { getLandingContent } from "@/lib/server/contentRepo";
import { listFormsForPage } from "@/lib/server/formsRepo";
import { listAllSports } from "@/lib/server/sportsRepo";
import { LandingEditor } from "@/admin/screens/landing/LandingEditor";

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
  await requirePage("landing");

  const [content, sports, forms] = await Promise.all([
    getLandingContent(),
    listAllSports(),
    listFormsForPage("landing"),
  ]);

  return (
    <LandingEditor
      initialContent={content}
      initialSports={sports}
      forms={forms}
      year={new Date().getFullYear()}
    />
  );
}
