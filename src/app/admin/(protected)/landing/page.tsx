import { getLandingContent } from "@/lib/server/contentRepo";
import { listAllSports } from "@/lib/server/sportsRepo";
import { LandingEditor } from "./_components/LandingEditor";

export const dynamic = "force-dynamic";

/**
 * Deliberately uses the throwing loaders, not the safe ones: an editor that
 * quietly showed the defaults after a failed read would let someone "save" them
 * straight over the real content.
 *
 * Sports are loaded only so the preview beside the form is the real page rather
 * than the page minus its cards. They are edited on their own screen.
 */
export default async function LandingAdminPage() {
  const [content, sports] = await Promise.all([getLandingContent(), listAllSports()]);

  return <LandingEditor initialContent={content} sports={sports} year={new Date().getFullYear()} />;
}
